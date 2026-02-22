export default function TestPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-primary">Compicfy Test</h1>
        <p className="text-muted-foreground mt-2">
          If you see styled text, Tailwind is working!
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <h2 className="text-card-foreground font-semibold">Card 1</h2>
            <p className="text-muted-foreground text-sm">
              This is a card component
            </p>
          </div>

          <div className="bg-primary p-4 rounded-lg">
            <p className="text-primary-foreground">Primary color</p>
          </div>

          <div className="bg-secondary p-4 rounded-lg">
            <p className="text-secondary-foreground">Secondary color</p>
          </div>
        </div>

        <button className="mt-8 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
          Test Button
        </button>
      </div>
    </div>
  );
}
