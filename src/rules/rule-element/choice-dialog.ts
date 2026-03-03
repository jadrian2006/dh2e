import type { ChoiceOption } from "./choice-set.ts";

/**
 * A simple dialog for ChoiceSet prompts during item creation.
 *
 * Uses Foundry's DialogV2 API.
 */
class ChoiceDialog {
    /** Show a choice dialog and return the selected value, or null if cancelled */
    static async prompt(title: string, choices: ChoiceOption[]): Promise<string | null> {
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

        return new Promise<string | null>((resolve) => {
            const dialog = new fd.DialogV2({
                window: { title: "Choose Option" },
                content,
                buttons: [{
                    action: "confirm",
                    icon: "fas fa-check",
                    label: "Confirm",
                    callback: (_event: Event, _button: HTMLElement, dialogEl: HTMLElement) => {
                        const selected = dialogEl.querySelector<HTMLInputElement>(
                            "input[name='choice']:checked",
                        );
                        resolve(selected?.value ?? null);
                    },
                }, {
                    action: "cancel",
                    icon: "fas fa-times",
                    label: "Cancel",
                    callback: () => resolve(null),
                }],
                close: () => resolve(null),
            });
            dialog.render({ force: true });
        });
    }
}

export { ChoiceDialog };
