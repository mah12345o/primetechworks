import * as v from "valibot";

export interface ClientFormData {
  name: string;
  city: string;
  email: string;
  mobile: string;
  password?: string;
  amount?: string;
}

export interface FieldErrors {
  name?: string;
  city?: string;
  email?: string;
  mobile?: string;
  password?: string;
  amount?: string;
}

export const createClientFormSchema = (isEdit: boolean) =>
  v.object({
    name: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty("Full name is required"),
      v.minLength(3, "Name must be at least 3 characters")
    ),
    city: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty("City is required"),
      v.minLength(3, "City must be at least 3 characters")
    ),
    email: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty("Email address is required"),
      v.email("Please enter a valid email address")
    ),
    mobile: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty("Mobile number is required"),
      v.regex(/^\d+$/, "Mobile number must contain digits only"),
      v.length(10, "Mobile number must be exactly 10 digits")
    ),
    password: isEdit
      ? v.pipe(
          v.string(),
          v.trim(),
          v.check(
            (val) => !val || val.length >= 8,
            "Password must be at least 8 characters"
          )
        )
      : v.pipe(
          v.string(),
          v.trim(),
          v.nonEmpty("Password is required"),
          v.minLength(8, "Password must be at least 8 characters")
        ),
    amount: v.optional(
      v.pipe(
        v.string(),
        v.trim(),
        v.check(
          (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
          "Amount must be a valid non-negative number"
        )
      )
    ),
  });

export function validateClientForm(
  formData: ClientFormData,
  isEdit: boolean = false
): {
  isValid: boolean;
  errors: FieldErrors;
  data?: {
    name: string;
    city: string;
    email: string;
    mobile: string;
    password?: string;
    amount?: string;
  };
} {
  const schema = createClientFormSchema(isEdit);
  const result = v.safeParse(schema, formData);

  if (!result.success) {
    const errors: FieldErrors = {};
    for (const issue of result.issues) {
      const field = issue.path?.[0]?.key as keyof FieldErrors;
      if (field && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { isValid: false, errors };
  }

  return { isValid: true, errors: {}, data: result.output };
}
