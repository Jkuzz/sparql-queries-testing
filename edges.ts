import { queryEndpoint } from './querying.ts'
import { NodeResponse } from './validators.ts'

const queriedEndpoints: { [key: string]: unknown } = JSON.parse(
  await Deno.readTextFile('classes.json')
)

// deno-lint-ignore no-explicit-any
const processedEndpoints: { [key: string]: any } = {}
const pendingEndpoints = new Set<string>()

for (const endpointUrl in queriedEndpoints) {
  const response = queriedEndpoints[endpointUrl]
  if (typeof response === 'string') {
    processedEndpoints[endpointUrl] = response
    continue
  }

  const parsedResponse = NodeResponse.safeParse(response)
  if (!parsedResponse.success) {
    processedEndpoints[endpointUrl] = 'edge: response parsing failure'
    console.log(parsedResponse)
    console.log(parsedResponse.error)
    continue
  }

  if(parsedResponse.data.results.bindings.length < 2) continue
  pendingEndpoints.add(endpointUrl)
  const firstClass = parsedResponse.data.results.bindings[0]
  const secondClass = parsedResponse.data.results.bindings[1]

  try {
    queryEndpoint(
      new URL(endpointUrl),
      getClassLinksQuery(firstClass.class.value, secondClass.class.value)
    )
      .catch(() => undefined)
      .then((res) => queryCallback(endpointUrl, res))
  } catch (error) {
    console.log(`Failed query of endpoint: <${endpointUrl}>`, error)
    processedEndpoints[endpointUrl] = 'edge: error'
  }
}

async function queryCallback(endpointUrl: string, res?: Response) {
  pendingEndpoints.delete(endpointUrl)
  console.log('Remaining endpoints: ' + pendingEndpoints.size)
  processedEndpoints[endpointUrl] = 'edge: unknown error'
  if (!res) {
    processedEndpoints[endpointUrl] = 'edge: no response'
  } else if (!res.ok) {
    processedEndpoints[endpointUrl] = 'edge: invalid response'
  } else {
    try {
      processedEndpoints[endpointUrl] = await res.json()
    } catch (error) {
      processedEndpoints[endpointUrl] = 'edge: response parsing error'
      console.log(error)
    }
  }

  if (pendingEndpoints.size === 0) {
    console.log('All endpoints resolved or timed out, saving all responses')
    Deno.writeTextFileSync('./edges.json', JSON.stringify(processedEndpoints))
  }
}

export function getClassLinksQuery(class1URI: string, class2URI: string) {
  return `
    SELECT DISTINCT ?property (COUNT(*) AS ?instanceCount)
    WHERE {
      ?class1 a <${class1URI}> .
      ?class2 a <${class2URI}> .
      ?class1 ?property ?class2 .
    }
  `
}
