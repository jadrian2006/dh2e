/** Register custom Handlebars helpers for chat templates */
export function registerHandlebarsHelpers(): void {
    Handlebars.registerHelper("signedInteger", (value: unknown) => {
        const num = Number(value);
        if (isNaN(num)) return "0";
        return num >= 0 ? `+${num}` : `${num}`;
    });

    Handlebars.registerHelper("eq", (a: unknown, b: unknown) => {
        return a === b;
    });

    Handlebars.registerHelper("gt", (a: unknown, b: unknown) => {
        return Number(a) > Number(b);
    });

    Handlebars.registerHelper("lt", (a: unknown, b: unknown) => {
        return Number(a) < Number(b);
    });

    Handlebars.registerHelper("localize", (key: unknown) => {
        return game.i18n.localize(String(key));
    });

    Handlebars.registerHelper("abs", (value: unknown) => {
        return Math.abs(Number(value));
    });

    Handlebars.registerHelper("format", (key: string, options: Record<string, unknown>) => {
        return game.i18n.format(String(key), options.hash as Record<string, string>);
    });
}
