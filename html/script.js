const { createApp, ref, onMounted, onUnmounted, computed, nextTick } = Vue;

const CONFIG = {
  DAMAGE_INDICATOR_DURATION: 500,
  HEALTH_BOUNDS: { MIN: 0, MAX: 100 },
  ARMOR_BOUNDS: { MIN: 0, MAX: 100 },
  EVENT_TYPES: {
    UPDATE_HUD: "UpdateHUD",
    UPDATE_HEALTH: "updateHealth",
    UPDATE_ARMOR: "updateArmor",
  },
};

const app = createApp({
  setup() {
    const state = {
      showAll: ref(true),
      health: ref(100),
      armor: ref(100),
      showDamage: ref(false),
      damageAmount: ref(0),
    };

    let damageTimer = null;
    let messageHandler = null;
    const utils = {
      formatNumber: (value) => {
        if (typeof value !== "number" || isNaN(value)) return 0;
        return Math.round(Math.max(0, value));
      },

      clampValue: (value, min, max) => {
        return Math.max(min, Math.min(max, value));
      },

      isValidData: (data) => {
        return data && typeof data === "object";
      },

      debounce: (func, delay) => {
        let timeoutId;
        return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
      },
    };

    const damageSystem = {
      show: (damage) => {
        if (damage <= 0) return;

        if (damageTimer) {
          clearTimeout(damageTimer);
        }

        state.damageAmount.value = damage;
        state.showDamage.value = true;

        damageTimer = setTimeout(() => {
          state.showDamage.value = false;
          state.damageAmount.value = 0;
          damageTimer = null;
        }, CONFIG.DAMAGE_INDICATOR_DURATION);
      },

      clear: () => {
        if (damageTimer) {
          clearTimeout(damageTimer);
          damageTimer = null;
        }
        state.showDamage.value = false;
        state.damageAmount.value = 0;
      },
    };
    const hudController = {
      updateHealth: (newHealth) => {
        if (typeof newHealth !== "number") return;

        const oldHealth = state.health.value;
        const clampedHealth = utils.clampValue(
          newHealth,
          CONFIG.HEALTH_BOUNDS.MIN,
          CONFIG.HEALTH_BOUNDS.MAX
        );

        state.health.value = clampedHealth;
        if (oldHealth > clampedHealth) {
          const damage = oldHealth - clampedHealth;
          damageSystem.show(damage);
        }
      },

      updateArmor: (newArmor) => {
        if (typeof newArmor !== "number") return;

        state.armor.value = utils.clampValue(
          newArmor,
          CONFIG.ARMOR_BOUNDS.MIN,
          CONFIG.ARMOR_BOUNDS.MAX
        );
      },

      updateAll: (data) => {
        if (!utils.isValidData(data)) return;

        const { health: newHealth, armor: newArmor } = data;
        if (newHealth !== undefined) {
          hudController.updateHealth(newHealth);
        }
        if (newArmor !== undefined) {
          hudController.updateArmor(newArmor);
        }
      },
    };
    const eventHandler = {
      handleMessage: (event) => {
        try {
          const { data } = event;
          if (!data?.name) return;

          const { name, args } = data;

          switch (name) {
            case CONFIG.EVENT_TYPES.UPDATE_HUD:
              hudController.updateAll(args?.[0]);
              break;

            case CONFIG.EVENT_TYPES.UPDATE_HEALTH:
              if (args?.[0]) {
                hudController.updateHealth(args[0].health);
                if (args[0].damage > 0) {
                  damageSystem.show(args[0].damage);
                }
              }
              break;

            case CONFIG.EVENT_TYPES.UPDATE_ARMOR:
              if (args?.[0]) {
                hudController.updateArmor(args[0].armor);
                if (args[0].damage > 0) {
                  // You can add armor damage visualization here if needed
                }
              }
              break;

            default:
              console.warn(`Unknown HUD event: ${name}`);
          }
        } catch (error) {
          console.error("HUD Event Processing Error:", {
            error: error.message,
            stack: error.stack,
            eventData: event.data,
          });
        }
      },

      init: () => {
        messageHandler = eventHandler.handleMessage;
        window.addEventListener("message", messageHandler, { passive: true });
      },

      destroy: () => {
        if (messageHandler) {
          window.removeEventListener("message", messageHandler);
          messageHandler = null;
        }
      },
    };
    const formattedHealth = computed(() =>
      utils.formatNumber(state.health.value)
    );
    const formattedArmor = computed(() =>
      utils.formatNumber(state.armor.value)
    );
    onMounted(() => {
      eventHandler.init();
    });

    onUnmounted(() => {
      damageSystem.clear();
      eventHandler.destroy();
    });
    return {
      showAll: state.showAll,
      health: state.health,
      armor: state.armor,
      showDamage: state.showDamage,
      damageAmount: state.damageAmount,
      formattedHealth,
      formattedArmor,
    };
  },
});
try {
  app.mount("#main-container");
} catch (err) {
  console.error(err);
}
