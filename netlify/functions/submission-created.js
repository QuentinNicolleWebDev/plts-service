// Fonction déclenchée automatiquement par Netlify à CHAQUE soumission
// du formulaire (événement "submission-created").
// Elle ajoute / met à jour le contact dans une liste Brevo.
// L'ajout à la liste déclenche ensuite l'automatisation Brevo
// qui envoie l'email de confirmation au client.
//
// Variables d'environnement à définir dans Netlify
// (Site settings → Environment variables) :
//   - BREVO_API_KEY  : votre clé API Brevo (v3)
//   - BREVO_LIST_ID  : l'identifiant numérique de la liste Brevo

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const data = (body.payload && body.payload.data) || {};

    const {
      prenom = "",
      nom = "",
      email = "",
      tel = "",
      ville = "",
      type = "",
      message = "",
    } = data;

    // Sécurité : sans email, on ne peut rien faire côté Brevo
    if (!email) {
      return { statusCode: 200, body: "Pas d'email, contact ignoré." };
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = parseInt(process.env.BREVO_LIST_ID, 10);

    if (!apiKey || !listId) {
      console.error("BREVO_API_KEY ou BREVO_LIST_ID manquant.");
      return { statusCode: 500, body: "Configuration Brevo incomplète." };
    }

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        updateEnabled: true, // met à jour si le contact existe déjà
        attributes: {
          PRENOM: prenom,
          NOM: nom,
          SMS: tel,          // attribut téléphone standard de Brevo
          VILLE: ville,
          TYPE_DEMANDE: type,
          MESSAGE: message,
        },
        listIds: [listId],
      }),
    });

    // 201 = contact créé, 204 = contact mis à jour : les deux sont OK
    if (!response.ok && response.status !== 204) {
      const detail = await response.text();
      console.error("Erreur Brevo :", response.status, detail);
      return { statusCode: 502, body: "Erreur lors de l'envoi à Brevo." };
    }

    return { statusCode: 200, body: "Contact transmis à Brevo." };
  } catch (err) {
    console.error("Erreur fonction submission-created :", err);
    return { statusCode: 500, body: "Erreur interne." };
  }
};
