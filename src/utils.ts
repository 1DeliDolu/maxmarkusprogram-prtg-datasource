export const regexPattern = /^\/(.*)\/([gmi]*)$/m;

export const isRegex = (str: string) => {
  if (str.length < 2) {
    return false;
  }
  return str[0] === '/' && str[str.length - 1] === '/';
};

export const isNumeric = (value: any) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

export const isTemplateVariable = (str: string) => {
  return typeof str === 'string' && str.startsWith('$');
};

export function buildRegex(str: string): RegExp {
    const matches = str.match(regexPattern);
    if (!matches) {
        throw new Error('Invalid regex pattern');
    }
    const pattern = matches[1];
    const flags = matches[2] !== "" ? matches[2] : undefined;
    return new RegExp(pattern, flags);
}

export function escapeRegex(value: string): string {
    return value.replace(/[\\^$*+?.()|[\]{}\/]/g, "\\$&");
}
// eslint-disable-next-line
export function filterMatch(findItem: string, filterStr: string, invert: boolean = false): boolean {
    let result: boolean;
    if (isRegex(filterStr)) {
        const rex = buildRegex(filterStr);
        result = rex.test(findItem);
    } else {
        result = findItem === filterStr;
    }
    if (invert) {
        return !result;
    }
    return result;
}

/**
 * Pads numbers with leading zeros
 */
export const pad = (num: number) => {
  return num < 10 ? '0' + num : num;
};

/**
 * Checks if the value is a number or can be converted to a number
 */
export const isNumberLike = (value: unknown) => {
  if (typeof value === 'number') {
    return true;
  }
  if (typeof value === 'string') {
    return !isNaN(Number(value));
  }
  return false;
};

/**
 * Converts a string template variable to a regex
 */
export const templateToRegex = (template: string) => {
  const regexStr = template
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`);
};
