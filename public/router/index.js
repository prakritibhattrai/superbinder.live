import Landing from "../components/Landing.js";

const routes = [
  {
    path: "/",
    component: Landing,
    name: "landing",
    // requiresAuth:true,
  }
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const loggedIn = true;

  // If route requires auth and user is not logged in
  if (to.meta.requiresAuth && !loggedIn.value) {
    // Redirect to landing page
    next({ name: "landing" });
  } else {
    // Otherwise proceed as normal
    next();
  }
});

export default router;
