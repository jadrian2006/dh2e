/** Register custom Handlebars helpers for chat templates */
export function registerHandlebarsHelpers(): void {
    fa.api.Handlebars.registerHelper("signedInteger", (value: unknown) => {
        const num = Number(value);
        if (isNaN(num)) return "0";
        return num >= 0 ? `+${num}` : `${num}`;
    });

    fa.api.Handlebars.registerHelper("eq", (a: unknown, b: unknown) => {
        return a === b;
    });

    fa.api.Handlebars.registerHelper("gt", (a: unknown, b: unknown) => {
        return Number(a) > Number(b);
    });

    fa.api.Handlebars.registerHelper("lt", (a: unknown, b: unknown) => {
        return Number(a) < Number(b);
    });

    fa.api.Handlebars.registerHelper("localize", (key: unknown) => {
        return game.i18n.localize(String(key));
    });

    fa.api.Handlebars.registerHelper("abs", (value: unknown) => {
        return Math.abs(Number(value));
    });
}
