type FormValue =
  | string
  | number
  | boolean
  | File
  | Blob
  | null
  | undefined
  | Array<string | number | boolean | File | Blob>;

export function objectToFormData(payload: Record<string, FormValue>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) =>
        formData.append(key, item instanceof Blob ? item : String(item)),
      );
      continue;
    }

    formData.append(key, value instanceof Blob ? value : String(value));
  }

  return formData;
}
