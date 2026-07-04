/**
 * Alliance Travel — lead capture configuration.
 *
 * Project Supabase « alliance-travel-leads » (région eu-west-3 / Paris,
 * offre gratuite). La clé anon est PUBLIQUE par conception : grâce à la
 * row-level security, elle permet uniquement d'AJOUTER un lead dans la
 * table `leads` — personne ne peut lire les leads avec cette clé.
 *
 * Vider l'une des deux valeurs désactive complètement la capture
 * (le site se comporte alors exactement comme avant).
 */
window.AT_LEADS = {
  url: "https://vxblgxiamtphabfswnxb.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4YmxneGlhbXRwaGFiZnN3bnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDkyODMsImV4cCI6MjA5ODY4NTI4M30.76mBGuCTKGoaVCexkpzsc8pMBRyAfRMNDRPuX2nrVks",
};
