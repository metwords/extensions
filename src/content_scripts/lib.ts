export interface WordRange {
	name: string
	times: number,
	range: Range,
}

interface WordIndex {
	word: string,
	start: number
	end: number
}

const skipTags = new Map<string, boolean>([
	["HEAD", true],
	["H1", true],
	["H2", true],
	["H3", true],
	["H4", true],
	["H5", true],
	["H6", true],
	["SCRIPT", true],
	["STYLE", true],
	["PRE", true],
	["CODE", true],
	["SAMP", true],
	["TEXTAREA", true],
	["IMG", true],
	["SVG", true],
	["CANVAS", true],
	["VIDEO", true],
	["AUDIO", true],
	["FORM", true],
	["INPUT", true],
	["SELECT", true],
	["BUTTON", true],
	["A", true],
	["MARK", true],
	["INS", true],
	["DEL", true],
	["SUP", true],
	["SUB", true],
	["SMALL", true],
	["BIG", true],
	["CITE", true],
	["FIELDSET", true],
	["LEGEND", true],
	["CAPTION", true],
	["LABEL", true],
	["OBJECT", true],
	["VAR", true],
	["KBD", true],
	["DETAILS", true],
	["SUMMARY", true],
])

export function getWordRanges(n: Node, s: Array<WordRange>): Array<WordRange> {
	if (n.nodeType == Node.ELEMENT_NODE && skipTags.get(n.nodeName) == true) {
		return s
	}

	if (n.nodeType == Node.TEXT_NODE) {
		let wordIndexes = getWordIndexes(n.nodeValue!)
		wordIndexes.forEach((v: WordIndex) => {
			let range = document.createRange()
			range.setStart(n, v.start)
			range.setEnd(n, v.end)

			s.push({
				name: v.word,
				times: 0,
				range: range
			})
		})
	}

	for (let c = n.firstChild; c != null; c = c.nextSibling) {
		s = getWordRanges(c, s)
	}

	return s
}

export function getWordIndexes(s: string): Array<WordIndex> {
	const indexes = new Array<WordIndex>()
	let inWord = false
	let start = 0
	let end = start
	for (let i = 0; i < s.length; i++) {
		let c = s[i]
		if (isWordCharacter(c) && inWord == false && (i == 0 || isWordDelimiter(s[i - 1]))) {
			inWord = true
			start = i
		}

		if (isWordDelimiter(c) && inWord == true) {
			inWord = false
			end = i
		}

		if (isWordCharacter(c) && i == s.length - 1 && inWord == true) {
			inWord = false
			end = s.length
		}

		if (!isWordCharacter(c)) {
			inWord = false
		}

		// at least 2 characters long
		if (end - start >= 2) {
			let word = s.slice(start, end).toLowerCase()
			let wordIndex = {
				word: word,
				start: start,
				end: end
			}
			indexes.push(wordIndex)

			// reset end
			end = start
		}

	}
	return indexes
}

const selectedID = "metword-selected"

export function markWord(range: WordRange, selected: boolean) {
	let ele = document.createElement("xmetword")
	if (selected) {
		ele.setAttribute("id", selectedID)
	}
	const color = "red"
	try {
		// To surround range contents with the mark element.
		// The surroundContent() may fail when a range spreads across Node element boundries:
		// See: https://developer.mozilla.org/en-US/docs/Web/API/Range/surroundContents
		range.range.surroundContents(ele)
	} catch {
		// Use the extractContent() + insertNode() equivalent instead in case of error:
		ele.appendChild(range.range.extractContents())
		range.range.insertNode(ele)
	}
	ele.style.setProperty("--met-color", color)
	ele.setAttribute("data-times", "-".repeat(range.times))
}

export function markSelected(range: Range, selectedText: string) {
	const parent = range.startContainer.parentNode!
	if (isMarkedNode(parent, selectedText)) {
		(parent as HTMLElement).setAttribute("id", selectedID)
		return
	}

	markWord({ name: selectedID, range: range, times: 0 }, true)
}

function isMarkedNode(n: Node, selectedText: string): boolean {
	// use getText() instead of comparing Node text with selectedText:
	// marked nodes may contain child nodes.
	const selectedElement = getSelectedElement()
	return (n.nodeType == Node.ELEMENT_NODE && n.nodeName == "XMETWORD" &&
		getText(n, "", selectedElement) == selectedText)
}

export function getSelectedElement(): HTMLElement | null {
	return document.getElementById(selectedID)
}

function isWordCharacter(s: string): boolean {
	let re = /^[a-zA-Z]$/
	return re.test(s)
}

function isWordDelimiter(s: string): boolean {
	let re = /^[\s.,!?;:'")(\]\[]$/
	return re.test(s)
}

const delimiter = /^[.!??????????]$/
const close = /^[\s"'??????]$/
const chineseClose = /^[?????????]$/
const space = /^[\s]$/

// This is a 'good enough' algorithm that gets the sentence a 'selection' resides in.
// It only relies on sentence delimiters, so in some cases periods like in 'Mellon C. Collie' produce wrong sentence.
// This is a known bug and results are acceptable to me. To keep code simple, I choose not to fix it.
export function getSceneSentence(selectText: string): string {
	const word = paddingLeft + selectText + paddingRight
	const selectedElement = getSelectedElement()
	console.log("selectedText is:", selectText)
	if (!selectedElement) return ""
	const parent = getEnclosingNode(selectedElement)
	console.log("parent is:", parent)
	const text = getText(parent, "", selectedElement)
	console.log("text is:", text)
	let start = 0
	let end = text.length
	let found = false
	for (let i = 0; i < text.length; i++) {
		if (delimiter.test(text[i]) && found == false && (close.test(text[i + 1]) || chineseClose.test(text[i]))) {
			start = i + 1
		}
		for (let j = 0; j < word.length; j++) {
			if (text[i + j] != word[j]) {
				break
			}
			if (j == word.length - 1) {
				found = true
				i = i + j
			}
		}
		if (found == true && delimiter.test(text[i]) && (close.test(text[i + 1]) || chineseClose.test(text[i]))) {
			end = i + 1
			break
		}
	}

	return text.slice(start, end).trim()
}

const dropped = new Map<string, boolean>([
	["SCRIPT", true],
	["STYLE", true],
	["PRE", true],
	["SUP", true],
	["SUB", true],
])

const paddingSpace = new Map<string, boolean>([
	["BR", true],
])

// All block level elements, via
// https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements
function isBlockElement(n: Node): boolean {
	const elements = new Map<string, boolean>([
		["ADDRESS", true],
		["ARTICLE", true],
		["ASIDE", true],
		["BLOCKQUOTE", true],
		["DETAILS", true],
		["DIALOG", true],
		["DD", true],
		["DIV", true],
		["DL", true],
		["DT", true],
		["FIELDSET", true],
		["FIGCAPTION", true],
		["FIGURE", true],
		["FOOTER", true],
		["H1", true],
		["H2", true],
		["H3", true],
		["H4", true],
		["H5", true],
		["H6", true],
		["FORM", true],
		["HEADER", true],
		["HGROUP", true],
		// ["HR", true],
		["LI", true],
		["MAIN", true],
		["NAV", true],
		["OL", true],
		["P", true],
		["PRE", true],
		["SECTION", true],
		["TABLE", true],
		["UL", true],

	])
	return elements.get(n.nodeName) == true
}

function getEnclosingNode(n: Node): Node {
	for (n = n.parentNode!; !isBlockElement(n); n = n.parentNode!) {
		for (let c = n.firstChild; c != null; c = c.nextSibling) {
			if (c.nodeType == Node.TEXT_NODE && c.nodeValue!.match(`[,.!;????????????????]`)) {
				return n
			}
		}
	}
	return n
}

// for highlighting and exact matching
const paddingLeft = "<xmet>"
const paddingRight = "</xmet>"

function getText(n: Node, text: string, selectedElement: HTMLElement | null): string {
	// selection marked element
	if (n == selectedElement) {
		// marked element may have an ElementNode child, like <em>selectedText</em>.
		var selectText = ""
		for (let c = n.firstChild; c != null; c = c.nextSibling) {
			selectText = getText(c, selectText, selectedElement)
		}
		return text + paddingLeft + selectText + paddingRight
	}

	if (n.nodeType == Node.TEXT_NODE) {
		return text + n.nodeValue
	}

	if (n.nodeType == Node.ELEMENT_NODE && dropped.get(n.nodeName) == true) {
		return text
	}

	for (let c = n.firstChild; c != null; c = c.nextSibling) {
		text = getText(c, text, selectedElement)
	}

	// post decorations
	if (n.nodeType == Node.ELEMENT_NODE && paddingSpace.get(n.nodeName) == true) {
		if (!space.test(text.slice(-1)))
			return text + " "
	}

	return text
}

export function getWord(selectedText: string): string {
	const re = /^([a-zA-Z]?[a-z]+|[A-Z]+)$/
	if (selectedText.match(re)) {
		return selectedText.toLowerCase()
	}
	return ""
}