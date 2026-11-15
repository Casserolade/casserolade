/** French punctuation never starts a line: the space before « : ; ! ? » and inside guillemets does not break. */
export function gluePunctuation(text: string): string {
  return text.replace(/ ([:;!?»])/g, ' $1').replace(/« /g, '« ');
}
