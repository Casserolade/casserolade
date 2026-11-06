/**
 * Search engines, link previews, page checkers and scripts. A name ending in « bot », « crawler » or « spider » counts
 * only before a slash, a semicolon, a parenthesis or the end: a phone named Cubot X30 stays a phone.
 */
const ROBOT = /(?:bot|crawler|spider)(?:\/|;|\s*\(|$)|facebookexternalhit|whatsapp|slackbot|headless|lighthouse|pagespeed|inspectiontool|python|curl\/|wget\/|go-http-client|node-fetch|axios\/|undici|okhttp|java\/|libwww|scrapy|httpclient/i;

/** A robot, even one that runs the page: it is not a visitor. Without any user agent, nobody is a visitor either. */
export function isRobot(userAgent: string | undefined): boolean {
  return !userAgent || ROBOT.test(userAgent);
}
