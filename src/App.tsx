import {
  Header,
  Hero,
  TechStack,
  Projects,
  About,
  Timeline,
  Location,
  Contact,
  Footer,
} from './sections'

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TechStack />
        <Projects />
        <About />
        <Timeline />
        <Location />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

export default App
