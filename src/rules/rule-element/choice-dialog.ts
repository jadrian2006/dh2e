import type { ChoiceOption } from "./choice-set.ts";

/**
 * A simple dialog for ChoiceSet prompts during item creation.
 *
 * Uses Foundry's native Dialog API for maximum compatibility.
 */
class ChoiceDialog {
    /** Show a choice dialog and return the selected value, or null if cancelled */
    static async prompt(title: string, choices: ChoiceOption[]): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            const optionsHtml = choices.map((c) =>
                `<label class="dh2e-choice-option">
                    <input type="radio" name="choice" value="${c.value}" />
                    <span>${c.label}</span>
                </label>`,
            ).join("");

            const content = `<form class="dh2e-choice-dialog">
                <p>${title}</p>
                <div class="dh2e-choice-list">${optionsHtml}</div>
            </form>`;

            const d = new Dialog({
                title: "Choose Option",
                content,
                buttons: {
                    confirm: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Confirm",
                        callback: (html: any) => {
                            const el = html instanceof HTMLElement ? html : html?.[0];
                            const selected = el?.querySelector<HTMLInputElement>(
                                "input[name='choice']:checked",
                            );
                            resolve(selected?.value ?? null);
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => resolve(null),
                    },
                },
                default: "confirm",
                close: () => resolve(null),
            });
            d.render(true);
        });
    }
}

export { ChoiceDialog };
