const term = document.querySelector(".term");
document.documentElement.classList.add("js");
document.querySelectorAll("details").forEach((d, i) => d.style.setProperty("--i", i));

// 스크롤하면 섹션이 차례로 등장
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }),
  { threshold: 0.12 },
);
term.querySelectorAll(":scope > section").forEach((s) => {
  s.classList.add("rv");
  io.observe(s);
});

// 유리 위 빛이 포인터를 따라감
addEventListener("pointermove", (e) => {
  const r = term.getBoundingClientRect();
  term.style.setProperty("--mx", e.clientX - r.left);
  term.style.setProperty("--my", e.clientY - r.top);
});
