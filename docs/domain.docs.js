/**
 * @typedef {$arrdom|$nordom|$strdom|$numdom|$bitdom|$soldom} $domain
 *
 * The internal representation of possible values for a certain variable.
 *
 * There are four representations and six names to distinct them internally:
 *
 * - domain
 *   - arrdom
 *   - nordom
 *     - strdom
 *     - numdom
 *       - soldom
 *       - bitdom
 *
 * We assume strdom/arrdom are always CSIS (that means "Canonical Sorted
 * Interval Sequeunce") which means each pair <lo,hi> in the representation is
 * properly ordered `lo <= hi`, each range [A,B,...] is ordered such that
 * `max(A) <= min(B)-1` (there must always be some gap between two ranges).
 *
 * THESE REPRESENTATIONS SHOULD ONLY BE USED INSIDE domain.js! Take care not to
 * leak unboxed domains because it will be confusing. Use arrdoms, with caution.
 *
 * The arrdom is the oldest of the four (though it was preceded by an even worse
 * representation) and reflects the domain closest to how humans represent the
 * domains. An arrdom is a flat array of number pairs. Each pair is a range with
 * a lo and a hi, both inclusive. Meaning [0, 15, 20, 300] represents a domain
 * that contains the numbers 0 through 15 and the numbers 20 through 300 (so
 * that makes 317 in total, not 315!). Arrdoms are assumed to be CSIS.
 *
 * The strdom is an optimized version of the arrdom where each number in the
 * arrdom is encoded as a two character string. We must use two characters since
 * strings in JS are 16bit and we're encoding up to 32bit (ok, SUP is 27bit).
 * Strdoms are assumed to be CSIS.
 *
 * The bitdom is an optimized version that represents all values in the domain
 * as bitwise flags. Since bitwise operators work on 32bit numbers only, that
 * means we could use at max 32 numbers (so 0 through 31) for small domain
 * representations. We actually only use 31 numbers because the most significant
 * bit is used by soldoms. And it prevents a lot of signed confusion in general.
 * CSIS is irrelevant for numdoms due to the way they are represented.
 *
 * The soldom is a number with the most significant (31st) bit set and it
 * represents a solved domain. The value of the domain can be found in the first
 * 27bits of the value since that's the number of bits used by the highest value
 * that finitedomain supports in its domains.
 *
 * A nordom represents a "normalized" domain, meaning the smallest representation
 * (with soldom<bitdom<strdom) and basically never an arrdom.
 *
 * A numdom is either a soldom or a bitdom and signifies a domain that'll do
 * `typeof domain === 'number'`. It used to mean bitdom before soldoms were
 * introduced but we needed to disambiguate them so numdom became a "super".
 */

/**
 * @typedef {number[]} $arrdom
 *
 * An "array domain" is an array of ranges. Should be CSIS form.
 */

/**
 * @typedef {$soldom|$bitdom|$strdom} $nordom
 *
 * A normalized domain in its most optimal form (with soldom<$bitdom<strdom).
 * Basically means any representation except arrdom. We currently don't
 * strictly enforce that the smallest representation is used, but that
 * may change if it could simplify the code...
 */

/**
 * @typedef {string} $strdom
 *
 * A "string domain" is an array of ranges encoded as strings. Two characters
 * per number in an arrdom. Should be CSIS form.
 */

/**
 * @typedef {$bitdom|$soldom} $numdom
 *
 * A domain represented as a number can mean two things:
 * - a soldom: in this case the most significant bit is SET and the remaining
 *             set bits represent the value.
 * - a bitdom: bitwise representation of included values. In this case each set
 *             bit represents that a value by the index of the bit is included
 *             in the domain (bit 1 = zero, bit 2 is one, etc)
 */

/**
 * @typedef {number} $soldom
 *
 * A solved domain. The number must have the most significant bit set (SOLVED_FLAG).
 * The other bits signify which value the domain was solved to. It is an optimization
 * step for quick checks whether a domain is solved to take shortcuts.
 * In the future we may use the most significant bit to signify a more complex bitwise
 * state and SOLVED_FLAG becomes another (unused) bit.
 */

/**
 * @typedef {number} $bitdom
 *
 * The number represents a bitwise field for bits 0 through 30 (but never 31!).
 * The state of each bit states whether a value by the index of the bit is included
 * in the domain. So if the least significant bit (bit 0) is "on", the zero is
 * part of the domain. This makes certain operations cheaper (but others more expensive).
 */
