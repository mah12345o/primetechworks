import { Request, Response, NextFunction } from "express";
import * as v from "valibot";

export const validate = (schema: v.GenericSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = v.safeParse(schema, req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: v.flatten(result.issues).nested,
      });
      return;
    }

    req.body = result.output;
    next();
  };
};
