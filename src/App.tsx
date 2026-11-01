import {
  Header,
  Hero,
  TechStack,
  Projects,
  OpenSource,
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
        <OpenSource />
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
