/**
 * Throws an injected error with a predefined message.
 * 
 * This is useful to trick the compiler to not mark following code as unreachable.
 *
 * @throws {Error} Always throws an error with the message 'Injected error'.
 */
export function throwInjectedError() {
    throw new Error('Injected error');
}