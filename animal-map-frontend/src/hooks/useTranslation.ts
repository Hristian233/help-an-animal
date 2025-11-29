import bg from "../translations/bg.json";

const current = bg;

export const useT = () => {
  return (key: string): string => {
    const value = key
      .split(".")
      .reduce<Record<string, unknown> | undefined>((o, i) => {
        if (o && typeof o === "object" && i in o) {
          return o[i] as Record<string, unknown>;
        }
        return undefined;
      }, current as Record<string, unknown>);

    return typeof value === "string" ? value : key;
  };
};
