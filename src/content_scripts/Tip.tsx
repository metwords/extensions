import * as React from 'react'
import { mergeStyleSets, Text, FontWeights, Spinner, SpinnerSize } from '@fluentui/react'
import { Word, WordObject, SceneObject } from './Word'
import { browser } from 'webextension-polyfill-ts'

interface TipProps {
	selectText: string
	word: string
	parent: Node
}

export default function Tip(props: TipProps) {
	const [owords, error] = useWords({ key: props.word, msg: { action: 'query', word: props.word } })

	if (error) return <p className="metwords-message" dangerouslySetInnerHTML={{ __html: error }}></p>
	if (!owords) return <Spinner size={SpinnerSize.medium}></Spinner>

	const words: WordObject[] = []
	owords.forEach((w: any) => {
		const scenes: SceneObject[] = []
		let known = false
		if (w.edges.meets != null) {
			if (w.edges.meets[0].state == 10) {
				known = true
			}

			if (w.edges.meets[0].edges.scenes != null) {
				w.edges.meets[0].edges.scenes.forEach((sc: any) => {
					const scene: SceneObject = {
						id: sc.id,
						sentence: sc.text,
						url: sc.url,
						createTime: new Date(sc.create_time),
					}
					scenes.push(scene)
				})
			}
		}
		const word: WordObject = {
			id: w.id,
			name: w.name,
			usPhonetic: w.us_phonetic,
			ukPhonetic: w.uk_phonetic,
			defs: w.def_zh,
			known: known,
			scenes: scenes
		}
		words.push(word)
	})


	return (
		<div className={styles.words}>
			{
				words.map((w: WordObject) => (<Word word={w} selectText={props.selectText} parent={props.parent} />))
			}
		</div>
	)
}

const styles = mergeStyleSets({
	title: {
		marginBottom: 12,
		fontWeight: FontWeights.semilight,
	},
	words: {
		display: 'block',
	},
})

interface QueryWordsProps {
	key: string
	msg: {
		action: string
		word: string
	}
}

function useWords(props: QueryWordsProps) {
	const [words, setWords] = React.useState<any>(null)
	const [error, setError] = React.useState<string | undefined>(undefined)

	React.useEffect(() => {
		async function sendMessage(msg: { action: string, word: string }) {
			const result = await browser.runtime.sendMessage(props.msg)
			if (!result.success) {
				setError(result.message)
				return
			}
			setWords(result.words)
		}

		sendMessage(props.msg)
	}, [props.key])

	return [words, error]
}