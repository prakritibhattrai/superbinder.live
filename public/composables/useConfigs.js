// composables/useConfigs.js
const env = Vue.ref({});

//If you don't want to change the backend code, you can add models here too
const models = Vue.ref([
  {
    name: { en: "Claude Sonnet 3.5", fr: "Claude Sonnet 3.5" },
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
  },
]);

export const useConfigs = () => {
  // Key Messages grouped by category
  const getConfigs = async () => {
    try {
      let results = await axios.get("/api/configs");
      console.log("Configs:", results)
      if(results?.data?.payload)
      {
        env.value = results.data.payload;
      }

      if (env.value.data?.payload?.models)
        models.value = env.value.data.payload.models;

    } catch (error) {
      console.log("Error", error);
      env.value = null;
    }
  };

  return {
    env,
    getConfigs,
    models,
  };
};
