const scaffoldSections = [
  {
    title: 'Backend',
    description: 'NestJS modular API prepared for PostgreSQL and TypeORM.',
    items: [
      'ConfigModule global',
      'DatabaseModule isolated',
      'Migrations and seeds folders ready',
    ],
  },
  {
    title: 'Frontend',
    description: 'Vite + React + TypeScript scaffold organized by feature.',
    items: [
      'app entrypoint separated',
      'feature folders created',
      'shared and services layers ready',
    ],
  },
  {
    title: 'Docs',
    description: 'Root documentation prepared for structure and rules.',
    items: ['README updated', 'Environment variables documented', 'Base folders tracked'],
  },
];

function App() {
  return (
    <main className="scaffold-shell">
      <section className="scaffold-panel">
        <div className="scaffold-hero">
          <p className="scaffold-kicker">Project scaffold</p>
          <h1>Control de infracciones y encierros</h1>
          <p className="scaffold-intro">
            Base estructural del proyecto lista para crecer sin mezclar reglas de negocio
            con el arranque de la aplicacion.
          </p>
        </div>

        <div className="scaffold-grid">
          {scaffoldSections.map((section) => (
            <article key={section.title} className="scaffold-card">
              <h2>{section.title}</h2>
              <p>{section.description}</p>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
