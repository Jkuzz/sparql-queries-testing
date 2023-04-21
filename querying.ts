/**
 * Query the SPARQL endpoint with the given query and handle results
 * @param endpoint
 * @param query
 * @returns JSON response content promise
 */
export function queryEndpoint(endpoint: URL, query: string) {
  let queryURL = endpoint + '?query=' + encodeURIComponent(query)
  queryURL += '&format=application%2Fsparql-results%2Bjson'
  return fetch(queryURL, {
    signal: AbortSignal.timeout(120 * 1000),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  })
}
