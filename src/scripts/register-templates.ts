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
        `systems/${SYSTEM_ID}/templates/chat/suppressive-fire-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/overwatch-card.hbs`,
        `systems/${SYSTEM_ID}/templates/chat/grapple-card.hbs`,
    ];
    fa.handlebars.loadTemplates(templatePaths);
}
