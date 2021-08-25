import { browser } from "webextension-polyfill-ts"
import config from '../config'

const meetsURL = config.meetsURL
const queryURL = config.queryURL
const addSceneURL = config.addSceneURL
const forgetSceneURL = config.forgetSceneURL
const knowURL = config.knowURL

browser.runtime.onMessage.addListener(async (msg) => {
	switch (msg.action) {
		case "query":
			return await queryWord(msg.word)
		case 'getMeets':
			return await getMeets()
		case 'addScene':
			return await addScene(msg.scene)
		case 'forgetScene':
			return await forgetScene(msg.id)
		case 'toggleKnown':
			return await toggleKnown(msg.id)
	}
})

var valid = false
var meets: any = {}

function invalidate() {
	valid = false
}

interface FetchResult {
	data: any,
	errorCode: number | false
}

async function fetchData(url: string, init?: RequestInit): Promise<FetchResult> {
	try {
		const res = await fetch(encodeURI(url), init)
		const errorCode = res.ok ? false : res.status
		const result = await res.json()
		return {
			data: result.data || null,
			errorCode: errorCode
		}
	} catch (err) {
		return {
			data: null,
			errorCode: 499
		}
	}
}

async function addScene(scene: any) {
	const body = {
		id: scene.id,
		url: scene.url,
		text: scene.text
	}
	let payload = JSON.stringify(body)
	let jsonHeaders = new Headers({
		'Content-Type': 'application/json'
	})

	const result = await fetchData(addSceneURL, {
		method: "POST",
		body: payload,
		headers: jsonHeaders
	})
	if (!result.errorCode) {
		// invalidate cache
		invalidate()
	}
	return result
}

async function toggleKnown(id: number) {
	const url = knowURL + id
	const result = await fetchData(url, {
		method: "POST",
	})
	if (!result.errorCode) {
		// invalidate cache
		invalidate()
	}
	return result
}

async function forgetScene(id: number) {
	const url = forgetSceneURL + id
	const result = await fetchData(url, {
		method: "DELETE",
	})
	if (!result.errorCode) {
		// invalidate cache
		invalidate()
	}
	return result
}

async function queryWord(word: string) {
	const url = queryURL + word
	const result = await fetchData(url)
	return result
}

async function getMeets() {
	if (valid) {
		return meets
	}
	try {
		const resp = await fetch(meetsURL)
		if (resp.status != 200) {
			return meets
		}
		const result = JSON.parse(await resp.text())
		meets = result.data
		valid = true
		return meets
	} catch (err) {
		return meets
	}
}

const hideMark = `xmetword::before { display: none !important; }`

browser.browserAction.onClicked.addListener(async () => {
	await browser.tabs.create({
		url: "https://www.metwords.com"
	})
})