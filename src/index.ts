import { type JSONValue, type JSONValidMap, type JSONValidObject } from "json-types2";

export * from "maps-diff";

export interface IFormToSerializableOptions {
	mutator?: IFormMapMutatorFunction;
	append?: IFormAppend;
	prepend?: IFormAppend;
}

export const formDataToObject = (fd: FormData) =>
	Object.fromEntries(
		Array.from(fd.keys()).map((key) => {
			const fdAll = fd.getAll(key);
			return [key, fdAll.length > 1 ? fdAll : fd.get(key)];
		})
	);

export const formById = (formId: string) => document.getElementById(formId) as HTMLFormElement;

export const formDataToJson = (fd: FormData) => JSON.stringify(formDataToObject(fd));

export const formToJson = (form: HTMLFormElement) => formDataToJson(new FormData(form));

export const formToJsonById = (formId: string) => formToJson(formById(formId));

// export const FormToObject = (form: HTMLFormElement) => FormDataToObject(new FormData(form));

// export const FormToObjectById = (formId: string) => FormToObject(FormById(formId));

export const mapToObject = Object.fromEntries;

export const formToObject = (form: HTMLFormElement, options?: IFormToSerializableOptions) =>
	mapToObject(formToMap(form, options));

export const formToObjectById = (formId: string, options?: IFormToSerializableOptions) =>
	formToObject(formById(formId), options);

export const formToMapById = (formId: string, options?: IFormToSerializableOptions) => formToMap(formById(formId), options);

/**
 * Represents a function that mutates a key-value pair. The function **must** return a value, or the key-value pair will be deleted.
 * The value is also deleted if the function returns `undefined`.
 * @param key - The key to be mutated.
 * @param value - The value to be mutated.
 * @returns The mutated value.
 */
export type IFormMapMutatorFunction = (key: string, value: JSONValue) => JSONValue;

export type IFormAppend = JSONValidMap | JSONValidObject;

/**
 * Converts an HTML form element into a Map object, where the keys are the names of the form inputs
 * and the values are the corresponding values of the form inputs.
 *
 * @param formElement - The HTML form element to be converted.
 * @param options - (Optional) An object containing the following options:
 *   - mutator: A function that mutates key-value pairs. The function **must** return a value, or all the key-value pairs will be deleted.
 *     The value is also deleted if the function returns `undefined`.
 *   - append: A map or object containing additional key-value pairs to be appended to the resulting map.
 *   - prepend: A map or object containing additional key-value pairs to be prepended to the resulting map.
 * @returns A Map object containing the form input names as keys and their corresponding values as values.
 *
 * @remarks
 * This function supports the following:
 * - HTML form elements names.
 * - Text inputs, text-areas, checkboxes, radio buttons, and select elements.
 * - Multiple select elements (returns an array of selected values).
 * - Custom mutator function to modify the values before they are added to the map.
 * - Appending additional key-value pairs to the resulting map.
 * - Prepending additional key-value pairs to the resulting map.
 * - Custom form elements with a `getValue()` method that returns the value of the element.
 *
 * This function does not support the following:
 * - HTML form inputs without a name attribute.
 * - File inputs (returns an empty string for file inputs).
 *
 * If the form element contains multiple inputs with the same name, the values will be added to the map as an array.
 *
 * It also supports and tries to call a `getValue()` method on the form's children, if it exists.
 * This is useful for custom form elements that need to do some processing before returning their value.
 * The value returned by `getValue()` should be JSON-serializable.
 *
 * @example
 * // Example 1: Converting a simple form with text inputs
 * const formElement = document.getElementById("myForm") as HTMLFormElement;
 * const formMap = FormToMap(formElement);
 * // Output: Map { "firstName" => "John", "lastName" => "Doe" }
 *
 * @example
 * // Example 2: Converting a form with checkboxes and radio buttons
 * const formElement = document.getElementById("myForm") as HTMLFormElement;
 * const formMap = FormToMap(formElement);
 * // Output: Map { "color" => "blue", "size" => "medium", "agree" => true }
 *
 * @example
 * // Example 3: Converting a form with a multiple select element
 * const formElement = document.getElementById("myForm") as HTMLFormElement;
 * const formMap = FormToMap(formElement);
 * // Output: Map { "fruits" => ["apple", "banana", "orange"] }
 *
 * @example
 * // Example 4: Using a custom mutator function
 * const formElement = document.getElementById("myForm") as HTMLFormElement;
 * const mutator = (key: string, value: string | string[]) => typeof value === "string" ? value.toUpperCase() : value;
 * const formMap = FormToMap(formElement, { mutator });
 * // Output: Map { "firstName" => "JOHN", "lastName" => "DOE" }
 *
 * @example
 * // Example 5: Appending additional key-value pairs
 * const formElement = document.getElementById("myForm") as HTMLFormElement;
 * const append = { additionalKey: "additionalValue" };
 * const formMap = FormToMap(formElement, { append });
 * // Output: Map { "firstName" => "John", "lastName" => "Doe", "additionalKey" => "additionalValue" }
 *
 * @example
 * // Example 6: Prepending additional key-value pairs
 * const formElement = document.getElementById("myForm") as HTMLFormElement;
 * const append = { additionalKey: "additionalValue" };
 * const formMap = FormToMap(formElement, { prepend });
 * // Output: Map { "additionalKey" => "additionalValue", "firstName" => "John", "lastName" => "Doe" }
 */
export function formToMap(
	formElement: HTMLFormElement,
	{ mutator, append, prepend }: IFormToSerializableOptions = {}
): JSONValidMap {
	if (!formElement || !(formElement instanceof HTMLFormElement)) {
		throw new Error("The form element must be an HTMLFormElement.");
	}

	const data = new Map<string, JSONValue>();

	if (prepend) {
		if (prepend instanceof Map) {
			prepend.forEach((value, key) => {
				data.set(key, value);
			});
		} else if (typeof prepend === "object") {
			Object.entries(prepend).forEach(([key, value]) => {
				data.set(key, value);
			});
		}
	}

	const children = [
		...formElement.querySelectorAll(
			// "input[name]:enabled:not([type=button]):not([type=reset]), select[name]:enabled, textarea[name]:enabled, keygen[name]:enabled",
			// ":is(input, select, textarea)[name]:enabled:not(:is([type=submit], [type=button], [type=reset]))",
			":is(input, select, textarea)[name]:enabled"
		),
	];

	const childrenLength = children.length;

	for (let i = 0; i < childrenLength; i++) {
		const child = children[i] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

		if (!child) {
			continue;
		}

		/* if (
			Q!["input", "select", "textarea"].includes(child.tagName.toLowerCase()) ||
			["submit", "button", "reset"].includes(child.type.toLowerCase()) ||
			child.disabled ||
			Q!child.name
		) {
			continue;
		} */

		if (["submit", "button", "reset", "file"].includes(child.type.toLowerCase())) {
			continue;
		}

		const childName = child.name;
		const childValue = getChildValue(child);

		const previousValue = data.get(childName);

		if (previousValue == null) {
			data.set(childName, childValue);
			continue;
		}

		if (childValue == null) {
			continue;
		}

		if (Array.isArray(previousValue)) {
			if (Array.isArray(childValue)) {
				previousValue.push(...childValue);
			} else {
				previousValue.push(childValue);
			}
			data.set(childName, previousValue);
		} else {
			if (Array.isArray(childValue)) {
				data.set(childName, [previousValue, ...childValue]);
			} else {
				data.set(childName, [previousValue, childValue]);
			}
		}
	}

	if (append) {
		if (append instanceof Map) {
			append.forEach((value, key) => {
				data.set(key, value);
			});
		} else if (typeof append === "object") {
			Object.entries(append).forEach(([key, value]) => {
				data.set(key, value);
			});
		}
	}

	if (mutator) {
		data.forEach((value, key) => {
			const newValue = mutator(key, value);

			if (newValue === undefined) {
				data.delete(key);
			} else if (newValue !== value) {
				data.set(key, newValue);
			}
		});
	}

	return data;
}

function getChildValue(child: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
	if ("getValue" in child && typeof child.getValue === "function") {
		return child.getValue() as JSONValue;
	}

	let childValue: string | string[] = child.value;

	// If the child is a select-multiple element, get the values of the selected options
	if (child instanceof HTMLSelectElement && child.multiple) {
		childValue = Array.from(child.selectedOptions).map((option) => option.value);
	}

	const isInputCheckable = child instanceof HTMLInputElement && ["checkbox", "radio"].includes(child.type.toLowerCase());

	if (isInputCheckable) {
		// Only add the value if it's checked
		/* if (!child.checked) {
			continue;
		} */

		// Add a falsy value if it's not checked
		childValue = child.checked ? childValue : null;
	}

	return childValue;
}
