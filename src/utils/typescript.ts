export function isEnumKey<T>(enumObj: T, value: any): value is keyof T {
    return Object.keys(enumObj).includes(value);
}

export function isEnumValue<T>(enumObj: T, value: any): value is T[keyof T] {
    return Object.values(enumObj).includes(value);
}
