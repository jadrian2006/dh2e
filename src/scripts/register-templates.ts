/** Preload Handlebars templates for chat cards */
export function preloadTemplates(): void {
    const templatePaths = [
        `systems/${SYSTEM_ID}/templates/chat/check-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/attack-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/damage-card.hbs`,
    ];
    loadTemplates(templatePaths);
}
