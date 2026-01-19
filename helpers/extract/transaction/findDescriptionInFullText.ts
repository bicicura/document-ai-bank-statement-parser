/**
 * Finds the description for a transaction by searching in the full document text.
 * Used as a fallback when Google Doc AI fails to extract the description.
 *
 * Unified approach:
 * 1. Search for amount in full text
 * 2. Look at nearby lines (±5) for something that looks like a description
 * 3. If not found, use sibling-based approach (find nearby tx, search for date in text format)
 */

type FindDescriptionParams = {
    fullText: string
    amount: number
    date: string
    entities: any[]
    currentEntityText: string
    usedIndices: Set<number>
}

export default function findDescriptionInFullText(
    params: FindDescriptionParams
): { description: string; index: number } | null {
    const { fullText, amount, date, entities, currentEntityText, usedIndices } = params

    if (!fullText || !amount) return null

    // Approach 1: Search for amount in text, look at nearby lines
    const nearbyResult = tryNearbyLinesApproach(fullText, amount, usedIndices)
    if (nearbyResult) return nearbyResult

    // Approach 2: Sibling-based - find nearby transaction, search for date in text format
    const siblingResult = trySiblingApproach(fullText, date, entities, currentEntityText, usedIndices)
    if (siblingResult) return siblingResult

    return null
}

/**
 * Search for amount in full text, then look at nearby lines for description
 */
function tryNearbyLinesApproach(
    fullText: string,
    amount: number,
    usedIndices: Set<number>
): { description: string; index: number } | null {
    const lines = fullText.split('\n')
    const amountPatterns = buildAmountPatterns(amount)

    // Find all lines that match the amount
    const amountLineIndices: number[] = []
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        for (const pattern of amountPatterns) {
            if (line === pattern || line.endsWith(pattern)) {
                amountLineIndices.push(i)
                break
            }
        }
    }

    // For each amount line, look at nearby lines for a description
    for (const amountLineIndex of amountLineIndices) {
        // Calculate character index for this position
        const charIndex = lines.slice(0, amountLineIndex).join('\n').length

        // Skip if we already used this match
        if (usedIndices.has(charIndex)) continue

        // Look backwards first (more common: description is before amount)
        for (let offset = 1; offset <= 5; offset++) {
            const lineIndex = amountLineIndex - offset
            if (lineIndex < 0) break

            const line = lines[lineIndex].trim()
            if (isValidDescription(line)) {
                return { description: line, index: charIndex }
            }
        }

        // Look forwards
        for (let offset = 1; offset <= 3; offset++) {
            const lineIndex = amountLineIndex + offset
            if (lineIndex >= lines.length) break

            const line = lines[lineIndex].trim()
            if (isValidDescription(line)) {
                return { description: line, index: charIndex }
            }
        }
    }

    return null
}

/**
 * Sibling-based approach:
 * 1. Find sibling transaction with description (closest by Y position)
 * 2. Locate sibling's description in full text
 * 3. Convert orphan's date to text format (03/24 → MAR 24)
 * 4. Search for date near sibling's position
 */
function trySiblingApproach(
    fullText: string,
    date: string,
    entities: any[],
    currentEntityText: string,
    usedIndices: Set<number>
): { description: string; index: number } | null {
    // Get Y position of current (orphan) entity
    const currentEntity = entities.find(e => e.mentionText === currentEntityText)
    const currentY = getEntityY(currentEntity)
    const currentPage = getEntityPage(currentEntity)

    if (currentY === null || currentPage === null) return null

    // Find sibling with description (closest by Y, same page)
    const sibling = findClosestSiblingWithDescription(entities, currentY, currentPage, currentEntityText)
    if (!sibling) return null

    // Extract description from sibling's mentionText
    const siblingDescription = extractDescriptionFromMentionText(sibling.mentionText || "")
    if (!siblingDescription) return null

    // Find sibling's description in full text
    const siblingIndex = fullText.indexOf(siblingDescription)
    if (siblingIndex === -1) return null

    // Convert date to text format (2025-03-24 or 03/24 → MAR 24)
    const dateTextFormat = convertDateToTextFormat(date)
    if (!dateTextFormat) return null

    // Search for date in text format near sibling's position (within 500 chars)
    const searchStart = Math.max(0, siblingIndex - 200)
    const searchEnd = Math.min(fullText.length, siblingIndex + 500)
    const searchArea = fullText.substring(searchStart, searchEnd)

    // Find line containing the date in text format (case-insensitive)
    const lines = searchArea.split('\n')
    const dateTextFormatLower = dateTextFormat.toLowerCase()
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.toLowerCase().includes(dateTextFormatLower) && isValidDescription(line)) {
            const index = searchStart + searchArea.indexOf(line)
            if (!usedIndices.has(index)) {
                return { description: line, index }
            }
        }
    }

    return null
}

function buildAmountPatterns(amount: number): string[] {
    const patterns: string[] = []
    const absAmount = Math.abs(amount)
    const sign = amount < 0 ? "-" : ""

    const formatted = absAmount.toFixed(2)
    const [whole, decimal] = formatted.split('.')
    const withCommas = Number(whole).toLocaleString('en-US')

    // -$1,000.00 or $1,000.00
    patterns.push(`${sign}$${withCommas}.${decimal}`)

    // -$1000.00 (without comma)
    if (withCommas !== whole) {
        patterns.push(`${sign}$${whole}.${decimal}`)
    }

    // 1,000.00 (without $ sign, for Citizen-style)
    patterns.push(`${withCommas}.${decimal}`)

    // 1000.00 (without comma, without $ sign)
    if (withCommas !== whole) {
        patterns.push(`${whole}.${decimal}`)
    }

    return patterns
}

function getEntityY(entity: any): number | null {
    const vertices = entity?.pageAnchor?.pageRefs?.[0]?.boundingPoly?.normalizedVertices
    if (!vertices || vertices.length === 0) return null
    return vertices[0]?.y ?? null
}

function getEntityPage(entity: any): string | null {
    return entity?.pageAnchor?.pageRefs?.[0]?.page ?? null
}

function findClosestSiblingWithDescription(
    entities: any[],
    currentY: number,
    currentPage: string,
    currentEntityText: string
): any | null {
    let closest: any | null = null
    let closestDistance = Infinity

    for (const entity of entities) {
        if (entity.type !== 'table_item') continue
        if (entity.mentionText === currentEntityText) continue
        if (getEntityPage(entity) !== currentPage) continue

        const mentionText = entity.mentionText || ""
        const hasDescription = extractDescriptionFromMentionText(mentionText) !== null

        if (!hasDescription) continue

        const entityY = getEntityY(entity)
        if (entityY === null) continue

        const distance = Math.abs(entityY - currentY)
        if (distance < closestDistance) {
            closestDistance = distance
            closest = entity
        }
    }

    return closest
}

function extractDescriptionFromMentionText(mentionText: string): string | null {
    let text = mentionText
        .replace(/^\d{1,2}\/\d{1,2}\s+/, '')
        .replace(/^[A-Z][a-z]{2}\s+\d{1,2}\s+/, '')

    text = text
        .replace(/-?\$?[\d,]+\.\d{2}\s*/, '')
        .trim()

    text = text
        .replace(/\.{2}\d{4}\s*/, '')
        .replace(/ACH Payment\s*/i, '')
        .replace(/ACH Pull\s*/i, '')
        .trim()

    if (text.length > 2 && isValidDescription(text)) {
        return text
    }

    return null
}

function convertDateToTextFormat(date: string): string | null {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

    let month: number
    let day: number

    const isoMatch = date.match(/^\d{4}-(\d{2})-(\d{2})$/)
    if (isoMatch) {
        month = parseInt(isoMatch[1], 10)
        day = parseInt(isoMatch[2], 10)
    } else {
        const slashMatch = date.match(/^(\d{1,2})\/(\d{1,2})$/)
        if (slashMatch) {
            month = parseInt(slashMatch[1], 10)
            day = parseInt(slashMatch[2], 10)
        } else {
            return null
        }
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null

    return `${months[month - 1]} ${day.toString().padStart(2, '0')}`
}

function isValidDescription(description: string | undefined): boolean {
    if (!description) return false
    if (description.length < 2) return false

    // Skip dates
    if (/^[A-Z][a-z]{2}\s+\d{1,2}$/.test(description)) return false  // "Dec 07"
    if (/^\d{1,2}\/\d{1,2}$/.test(description)) return false         // "03/24"

    // Skip amounts
    if (/^\$[\d,]+\.\d{2}$/.test(description)) return false          // "$100.00"
    if (/^-?\$[\d,]+\.\d{2}$/.test(description)) return false        // "-$100.00"
    if (/^[\d,]+\.\d{2}$/.test(description)) return false            // "100.00"
    if (/^-[\d,]+\.\d{2}$/.test(description)) return false           // "-100.00"

    // Skip headers and common non-description lines
    if (description === 'Description') return false
    if (description === 'Date (UTC)') return false
    if (description === 'Date') return false
    if (description === 'Type') return false
    if (description === 'Amount') return false
    if (description === 'End of Day Balance') return false
    if (description.includes('Banking services provided')) return false
    if (description === 'CITIZENS PAID EARLY') return false

    // Skip card number patterns
    if (/^\.{2}\d{4}$/.test(description)) return false               // "..9891"

    return true
}
