import { queryEndpoint } from './querying.ts'

type EndpointDescriptor = {
  endpoint: string
  status: string
}
const allEndpoints: EndpointDescriptor[] = JSON.parse(await Deno.readTextFile('endpoints.json'))[
  'data'
]
// deno-lint-ignore no-explicit-any
const queryResponses: { [key: string]: any } = {}

const endpoints = allEndpoints
  .filter((endpoint) => endpoint.status !== 'invalid' && endpoint.status !== 'unavailable')
  .map((endpoint) => endpoint.endpoint)

const pendingEndpoints = new Set<string>(endpoints)

endpoints.forEach((endpointUrl) => {
  queryResponses[endpointUrl] = 'pending'
})

endpoints.forEach((endpointUrl) => {
  try {
    queryEndpoint(new URL(endpointUrl), getClassesQuery(0, 10))
      .catch(() => undefined)
      .then((res) => queryCallback(endpointUrl, res))
  } catch (error) {
    console.log(`Failed query of endpoint: <${endpointUrl}>`, error)
    queryResponses[endpointUrl] = 'node: error'
  }
})

async function queryCallback(endpointUrl: string, res?: Response) {
  pendingEndpoints.delete(endpointUrl)
  console.log('Remaining endpoints: ' + pendingEndpoints.size)
  queryResponses[endpointUrl] = 'node: unknown error'
  if (!res) {
    queryResponses[endpointUrl] = 'node: no response'
  } else if (!res.ok) {
    queryResponses[endpointUrl] = `node: invalid response: ${res.status} ${res.statusText}`
  } else {
    try {
      queryResponses[endpointUrl] = await res.json()
    } catch (_error) {
      queryResponses[endpointUrl] = 'node: response parsing error'
    }
  }
  if (pendingEndpoints.size === 0) {
    console.log('All endpoints resolved or timed out, saving all responses')
    Deno.writeTextFileSync('./classes.json', JSON.stringify(queryResponses))
  }
}

export function getClassesQuery(offset: number, count: number) {
  return `
    SELECT DISTINCT ?class (COUNT(*) AS ?instanceCount)
    WHERE {
      ?s a ?class
    }
    GROUP BY ?class
    ORDER BY DESC(?instanceCount)
    LIMIT ${count}
    OFFSET ${offset}`
}
