module.exports = {
  mode: "jit",
  content: ["./src/**/*.{html,js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {},
  },
  safelist: [
    "bg-slate-100",
    "bg-slate-300",
    "bg-neutral-100",
    "bg-neutral-300",
    "bg-stone-100",
    "bg-stone-300",
    "bg-zinc-100",
    "bg-zinc-300",
  ],
  plugins: [],
};
