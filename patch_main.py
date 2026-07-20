with open("src/main.tsx", "r") as f:
    content = f.read()

content = content.replace("createRoot(document.getElementById('root')!).render(", """if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered: ', registration);
    }).catch((registrationError) => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

createRoot(document.getElementById('root')!).render(""")

with open("src/main.tsx", "w") as f:
    f.write(content)
