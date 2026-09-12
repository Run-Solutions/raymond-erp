import { redirect } from 'next/navigation'

// Entrada inicial: redirección directa al login en el servidor.
// Sin spinner ni página intermedia de carga.
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/login`)
}
