
export function toFixedBigExponent (balance: number): string {
  const stringVal = balance.toString(10);

  if (stringVal.indexOf('e')) {
    const splitOnExp = stringVal.split('e');
    const expNr = parseInt(splitOnExp[1]);

    if (expNr > 20) {
      const zerosString = Array(100).fill('0').join('');

      return splitOnExp[0].replace('.', '').padEnd(expNr, zerosString);
    }
  }

  return balance.toFixed(0);
}
