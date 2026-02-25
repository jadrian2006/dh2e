/** Preload Handlebars templates for chat cards */
export function preloadTemplates(): void {
    const templatePaths = [
        `systems/${SYSTEM_ID}/templates/chat/check-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/attack-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/damage-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/critical-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/focus-power-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/phenomena-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/corruption-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/requisition-card.hbs`,
    ];
    fa.handlebars.loadTemplates(templatePaths);
}
