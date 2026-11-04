/**
 * Les petites phrases du jeu, par personne et par moment : seulement les citations vérifiées,
 * mot pour mot. Généré par tools/phrases/genere.ts depuis data/collecte/petites_phrases_*.json :
 * ne pas modifier à la main. Les sources sont dans la collecte, et dans docs/gameplay/petites-phrases.md.
 */
export type Moment = 'pose' | 'casserole' | 'prison' | 'mort' | 'celebration' | 'heros' | 'achat' | 'actualiser' | 'echelon' | 'triple' | 'victoire' | 'defaite' | 'elimination' | 'attente';

export const PHRASES: Record<string, Partial<Record<Moment, string[]>>> = {
  "boyard": {
    "pose": [
      "Pedazo de perrito imperialista.",
      "Les cinq personnes les plus riches, ce sont les mêmes qui appauvrissent la France et l'Afrique.",
      "Commencez par retirer votre réforme des retraites."
    ],
    "celebration": [
      "Pedazo de perrito imperialista.",
      "Les cinq personnes les plus riches, ce sont les mêmes qui appauvrissent la France et l'Afrique."
    ],
    "casserole": [
      "L'extrême droite parle de ma montre. Je remets les pendules à l'heure.",
      "Commencez par retirer votre réforme des retraites."
    ]
  },
  "leaument": {
    "celebration": [
      "Vrai plaisir de faire rager l'extrême droite avec cet hommage tous les ans depuis cinq ans."
    ],
    "pose": [
      "Vrai plaisir de faire rager l'extrême droite avec cet hommage tous les ans depuis cinq ans.",
      "Je dois dire que je suis assez surpris parce que je pensais faire un duplex avec Franceinfo."
    ],
    "casserole": [
      "Vous faites de la désinformation."
    ]
  },
  "portes": {
    "pose": [
      "Calmez-vous collègues, il n'y a pas de ballon ici !",
      "Monsieur le ministre Olivier Dussopt, retirez votre réforme des retraites.",
      "Les sportifs israéliens ne sont pas les bienvenus aux Jeux olympiques à Paris."
    ],
    "prison": [
      "Calmez-vous collègues, il n'y a pas de ballon ici !",
      "Je retirerai mon tweet, le jour où vous retirerez cette réforme qui va sacrifier des milliers de gens, voilà la réalité !",
      "Je reviens déterminé et combatif, comme je l'étais avant mon exclusion, mon état d'esprit n'a pas changé."
    ],
    "casserole": [
      "Je retirerai mon tweet, le jour où vous retirerez cette réforme qui va sacrifier des milliers de gens, voilà la réalité !"
    ],
    "celebration": [
      "Je reviens déterminé et combatif, comme je l'étais avant mon exclusion, mon état d'esprit n'a pas changé."
    ]
  },
  "trouve": {
    "pose": [
      "Chaque député va être mis devant ses responsabilités.",
      "Lui-même, quelque part, n'y croit plus vraiment, puisqu'une majorité de Français souhaite son départ."
    ],
    "heros": [
      "Lui-même, quelque part, n'y croit plus vraiment, puisqu'une majorité de Français souhaite son départ."
    ],
    "mort": [
      "Ce sont de tristes vœux.",
      "Il ne reste que le pire."
    ]
  },
  "chikirou": {
    "celebration": [
      "Je lui ai fait un sourire kabyle."
    ],
    "pose": [
      "Je lui ai fait un sourire kabyle.",
      "On va redécouvrir Sophia Chikirou.",
      "Je n'incarnerai pas le Paris milliardaire, mais le Paris populaire."
    ],
    "heros": [
      "On va redécouvrir Sophia Chikirou.",
      "Je n'incarnerai pas le Paris milliardaire, mais le Paris populaire."
    ],
    "casserole": [
      "J'ai laissé pendant des années des adversaires politiques et médiatiques salir mon image."
    ]
  },
  "bompard": {
    "celebration": [
      "Et je le fais avec un grand sourire monsieur Toussaint."
    ],
    "casserole": [
      "Franchement, je ne pensais pas qu'ici, sur France Inter, on aurait les polémiques de la Bollorésphère.",
      "Je peux vous le dire dix fois si vous voulez."
    ],
    "pose": [
      "Franchement, je ne pensais pas qu'ici, sur France Inter, on aurait les polémiques de la Bollorésphère.",
      "Vous avez écouté la conférence madame ? Regardez au moins une conférence."
    ]
  },
  "panot": {
    "casserole": [
      "Bien sûr que non Emmanuel Macron n'est pas Philippe Pétain.",
      "Je pense que ce serait bien de ne même pas le dire dans cette interview."
    ],
    "pose": [
      "Ne pas oublier ces crimes, aujourd'hui plus que jamais, avec un président de la République qui rend honneur à Pétain et 89 députés RN."
    ],
    "mort": [
      "Je pense que ce serait bien de ne même pas le dire dans cette interview."
    ]
  },
  "ruffin": {
    "celebration": [
      "On a regagné des voix par centaines."
    ],
    "pose": [
      "Avec Jean-Luc à la télé tous les deux jours, ça nous étranglait.",
      "Vous êtes haï, vous êtes haï, vous êtes haï.",
      "Le football, c'est le bonheur de l'enfance."
    ],
    "casserole": [
      "Avec Jean-Luc à la télé tous les deux jours, ça nous étranglait."
    ],
    "heros": [
      "Vous êtes haï, vous êtes haï, vous êtes haï."
    ]
  },
  "melenchon": {
    "pose": [
      "La République, c'est moi ! C'est moi qui suis parlementaire.",
      "Qu'esseuh-que ça veut direuh ?",
      "Tu fermes ta petite bouche, tu me parles de politique.",
      "Je réponds si je veux, et comme je le veux.",
      "Je ne sais pas si Jésus était sur la croix. Je sais qui l'y a mis, paraît-il, ce sont ses propres compatriotes."
    ],
    "celebration": [
      "La République, c'est moi ! C'est moi qui suis parlementaire.",
      "Tu fermes ta petite bouche, tu me parles de politique."
    ],
    "casserole": [
      "La République, c'est moi ! C'est moi qui suis parlementaire.",
      "Je réponds si je veux, et comme je le veux."
    ],
    "mort": [
      "Vous êtes des gens sans principe, sans foi ni loi. Allez, bonsoir tout le monde.",
      "Faites mieux !"
    ],
    "heros": [
      "Faites mieux !"
    ]
  },
  "thevenoud": {
    "casserole": [
      "Phobie administrative."
    ],
    "pose": [
      "Phobie administrative."
    ]
  },
  "bouamrane": {
    "celebration": [
      "Parce que nous avons pris conscience de notre force."
    ],
    "heros": [
      "Parce que nous avons pris conscience de notre force."
    ],
    "pose": [
      "LFI discute avec des dictateurs. Je ne peux pas transiger avec ça.",
      "LFI est un parti colonialiste."
    ]
  },
  "guedj": {
    "celebration": [
      "La République c'est nous !",
      "Il n'y a pas que Jean-Luc Mélenchon dans la vie politique, c'est un non-événement."
    ],
    "pose": [
      "La République c'est nous !",
      "Pour la première fois de ma vie, j'ai dû dire de l'homme que j'ai aimé profondément qu'il est devenu un salopard antisémite.",
      "Il n'y a pas que Jean-Luc Mélenchon dans la vie politique, c'est un non-événement."
    ],
    "heros": [
      "La République c'est nous !"
    ],
    "mort": [
      "Malheur à celui qui fait péter la NUPES.",
      "Je félicite Raphaël Glucksmann pour sa victoire."
    ],
    "casserole": [
      "Malheur à celui qui fait péter la NUPES."
    ]
  },
  "vallaud": {
    "celebration": [
      "Cette suspension est une victoire et permet d'envisager le blocage et l'abrogation.",
      "Cette motion de censure, c'est d'abord votre échec."
    ],
    "pose": [
      "Cette motion de censure, c'est d'abord votre échec.",
      "Rien de nouveau ne paraît pouvoir se construire à l'ombre de celui qui veut que rien ne pousse.",
      "J'en ai marre que les PME paient les impôts des multinationales !",
      "Les gens ne sont pas contre payer des impôts, ils veulent que tout le monde les paye.",
      "De peur de trop en dire, Michel Barnier n'a pas dit grand chose."
    ],
    "mort": [
      "Je le dis peiné : la Nupes, ça ne marche pas, ça marche mal !",
      "De peur de trop en dire, Michel Barnier n'a pas dit grand chose."
    ]
  },
  "cahuzac": {
    "celebration": [
      "Merci, monsieur le député, de m'avoir permis de le dire devant la représentation nationale."
    ],
    "casserole": [
      "Je n'ai pas, monsieur le député, je n'ai jamais eu de compte à l'étranger, ni maintenant, ni auparavant.",
      "Je n'ai pas, je n'ai jamais eu de compte en Suisse, Jean-Jacques Bourdin."
    ],
    "pose": [
      "Je n'ai pas, monsieur le député, je n'ai jamais eu de compte à l'étranger, ni maintenant, ni auparavant.",
      "Vous y croyez toujours, moi je n'y ai jamais cru."
    ],
    "prison": [
      "J'ai été pris dans une spirale du mensonge et m'y suis fourvoyé. Je suis dévasté par le remords."
    ],
    "mort": [
      "J'ai été pris dans une spirale du mensonge et m'y suis fourvoyé. Je suis dévasté par le remords."
    ]
  },
  "hidalgo": {
    "mort": [
      "Selon moi, il y a trois personnes responsables de l'immense gâchis du quinquennat qui se termine…"
    ],
    "casserole": [
      "Selon moi, il y a trois personnes responsables de l'immense gâchis du quinquennat qui se termine…"
    ]
  },
  "valls": {
    "celebration": [
      "Et moi, j'aime l'entreprise !"
    ],
    "pose": [
      "Et moi, j'aime l'entreprise !",
      "Tu me mets quelques Blancs, quelques Whites, quelques Blancos !",
      "Les Roms ont vocation à revenir en Roumanie ou en Bulgarie.",
      "Car expliquer, c'est déjà vouloir un peu excuser."
    ],
    "casserole": [
      "Car expliquer, c'est déjà vouloir un peu excuser."
    ]
  },
  "faure": {
    "celebration": [
      "Taisez-vous maintenant !"
    ],
    "pose": [
      "Vous fissurez toutes les digues qui, depuis le gouvernement provisoire du général de Gaulle, ont jusqu'ici protégé la République du nationalisme.",
      "Jean-Luc Mélenchon est devenu aujourd'hui le boulet de la gauche.",
      "[…] pas de sang sur les murs.",
      "Si rien ne bouge évidemment la censure est acquise."
    ],
    "mort": [
      "Je respecte trop le processus démocratique de la primaire pour ne pas l'accepter avec sagesse.",
      "[…] pas de sang sur les murs."
    ],
    "heros": [
      "Je respecte trop le processus démocratique de la primaire pour ne pas l'accepter avec sagesse."
    ]
  },
  "cazeneuve": {
    "celebration": [
      "Je suis prêt à être candidat en 2027.",
      "C'est par un contrat qui me lie aux Français que je présente ma candidature."
    ],
    "heros": [
      "Je suis prêt à être candidat en 2027.",
      "C'est par un contrat qui me lie aux Français que je présente ma candidature."
    ],
    "mort": [
      "Il n'en est pas question une minute, il faut une nouvelle génération."
    ],
    "casserole": [
      "Il n'en est pas question une minute, il faut une nouvelle génération."
    ],
    "pose": [
      "[…] un large rassemblement qui va bien au-delà des périmètres des primaires étriquées."
    ]
  },
  "royal": {
    "celebration": [
      "Qui va sur la Grande Muraille conquiert la bravitude."
    ],
    "pose": [
      "Qui va sur la Grande Muraille conquiert la bravitude.",
      "Je ne suis pas énervée. Je suis en colère.",
      "Un concours de laideur, de vulgarité et d'exhibitionnisme."
    ],
    "casserole": [
      "Je ne suis pas énervée. Je suis en colère."
    ]
  },
  "glucksmann": {
    "celebration": [
      "On leur pisse dessus, on va pas rentrer dedans."
    ],
    "pose": [
      "On leur pisse dessus, on va pas rentrer dedans.",
      "Quand je vais à New-York ou à Berlin, je me sens plus chez moi culturellement, que quand je me rends en Picardie. Et c'est bien ça le problème."
    ],
    "casserole": [
      "Quand je vais à New-York ou à Berlin, je me sens plus chez moi culturellement, que quand je me rends en Picardie. Et c'est bien ça le problème."
    ],
    "heros": [
      "Quand je vais à New-York ou à Berlin, je me sens plus chez moi culturellement, que quand je me rends en Picardie. Et c'est bien ça le problème."
    ]
  },
  "hollande": {
    "pose": [
      "Moi, président de la République, je ne serai pas le chef de la majorité.",
      "Oui, je n'aime pas les riches. Je n'aime pas les riches, j'en conviens.",
      "Mon véritable adversaire n'a pas de nom, pas de visage, pas de parti."
    ],
    "heros": [
      "Moi, président de la République, je ne serai pas le chef de la majorité.",
      "Mon véritable adversaire n'a pas de nom, pas de visage, pas de parti."
    ],
    "celebration": [
      "Moi, président de la République, je ne serai pas le chef de la majorité."
    ],
    "mort": [
      "Voilà ce qui vous change, la mort habite la fonction présidentielle."
    ]
  },
  "doucet": {
    "pose": [
      "Le Tour de France continue à véhiculer une image machiste du sport.",
      "Combien de véhicules à moteur thermique circulent pour faire courir ces coureurs à vélo ?"
    ],
    "mort": [
      "Combien de véhicules à moteur thermique circulent pour faire courir ces coureurs à vélo ?"
    ],
    "casserole": [
      "Le Tour coûte à la Ville un peu plus de 600 000 euros. L'ardoise n'est pas anodine."
    ]
  },
  "lucas": {
    "celebration": [
      "Quel discours ringard : Il a 90 ans !",
      "Humaniste en carton-pâte, vous avez offert une victoire idéologique à Le Pen !"
    ],
    "casserole": [
      "Sanctionnez-nous tant que vous voulez !"
    ],
    "prison": [
      "Sanctionnez-nous tant que vous voulez !"
    ],
    "pose": [
      "Humaniste en carton-pâte, vous avez offert une victoire idéologique à Le Pen !"
    ]
  },
  "batho": {
    "casserole": [
      "C'est un mauvais budget."
    ],
    "mort": [
      "C'est un mauvais budget."
    ]
  },
  "hurmic": {
    "pose": [
      "Nous ne mettrons pas des arbres morts sur les places de la ville, notamment sur la place Pey-Berland.",
      "J'ai des collègues qui sont des shérifs, qui rêvent d'être le premier flic sur leur commune […] moi je ne suis pas un maire shérif."
    ],
    "celebration": [
      "Nous ne mettrons pas des arbres morts sur les places de la ville, notamment sur la place Pey-Berland."
    ],
    "mort": [
      "C'est pas du tout notre conception de la végétalisation."
    ],
    "heros": [
      "J'ai des collègues qui sont des shérifs, qui rêvent d'être le premier flic sur leur commune […] moi je ne suis pas un maire shérif."
    ],
    "casserole": [
      "J'étais peut-être un maire manifestant, mais j'étais aussi le maire des commerçants, en même temps."
    ]
  },
  "mamere": {
    "mort": [
      "Notre parti ne produit plus rien : il est prisonnier de ses calculs et de ses clans.",
      "Nous sommes devenus un syndicat d'élus."
    ],
    "heros": [
      "Nous sommes devenus un syndicat d'élus."
    ],
    "pose": [
      "Manuel Valls, ce n'est pas la gauche."
    ]
  },
  "piolle": {
    "celebration": [
      "On connaissait le Puy du Fou, maintenant on a le fou du Puy !"
    ],
    "pose": [
      "On connaissait le Puy du Fou, maintenant on a le fou du Puy !"
    ],
    "casserole": [
      "À vrai dire, je m'en fous un peu."
    ],
    "mort": [
      "À vrai dire, je m'en fous un peu."
    ]
  },
  "duflot": {
    "pose": [
      "Quand on cherche du confort, on s'achète des pantoufles.",
      "Pas un journaliste, mais un connard."
    ],
    "celebration": [
      "Quand on cherche du confort, on s'achète des pantoufles.",
      "Pas un journaliste, mais un connard."
    ]
  },
  "cohn_bendit": {
    "celebration": [
      "[…] mon pote, je te dis, jamais tu ne seras président de la République, parce que t'es trop minable."
    ],
    "casserole": [
      "La sexualité d'un gosse, c'est absolument fantastique […] Quand une petite fille de 5 ans commence à vous déshabiller, c'est fantastique, c'est un jeu érotico-maniaque..."
    ],
    "pose": [
      "La sexualité d'un gosse, c'est absolument fantastique […] Quand une petite fille de 5 ans commence à vous déshabiller, c'est fantastique, c'est un jeu érotico-maniaque..."
    ]
  },
  "jadot": {
    "celebration": [
      "Dans le passé, on a été moqués, traités de catastrophistes ou d'utopistes […] d'un seul coup, tout le monde est devenu écolo."
    ],
    "pose": [
      "Alors là, c'est les pays baltes, c'est là que c'est très compliqué, on ne va pas se raconter d'histoire.",
      "Sarkozy, Hollande, Macron... Ils ont tous eu leur chance. Et ils ont tous échoué."
    ],
    "mort": [
      "Alors là, c'est les pays baltes, c'est là que c'est très compliqué, on ne va pas se raconter d'histoire."
    ],
    "heros": [
      "Sarkozy, Hollande, Macron... Ils ont tous eu leur chance. Et ils ont tous échoué."
    ]
  },
  "rousseau": {
    "pose": [
      "Il faut changer de mentalité pour que manger une entrecôte cuite sur un barbecue ne soit plus un symbole de virilité."
    ],
    "celebration": [
      "Il faut changer de mentalité pour que manger une entrecôte cuite sur un barbecue ne soit plus un symbole de virilité."
    ]
  },
  "tondelier": {
    "celebration": [
      "Je vais vous ajouter à mon compte pénibilité si on n'abroge pas la réforme des retraites.",
      "Bah vous, ça vous a marqué visiblement.",
      "Le gouvernement a tout fait pour que cette manifestation soit un échec. Raté !"
    ],
    "mort": [
      "J'ai pas de souvenir. Je peux pas vous dire, je l'ai pas connu.",
      "Ce qui m'a marqué, c'est manger des pommes."
    ],
    "casserole": [
      "J'ai pas de souvenir. Je peux pas vous dire, je l'ai pas connu.",
      "Ce qui m'a marqué, c'est manger des pommes."
    ],
    "pose": [
      "Bah vous, ça vous a marqué visiblement."
    ]
  },
  "thevenot": {
    "celebration": [
      "Ma cohérence est parfaite.",
      "Nous devons continuer à garder cette flamme olympique, celle qui a vibré au sein de nos foyers."
    ],
    "pose": [
      "Ma cohérence est parfaite.",
      "La France Insoumise a un discours anti-France en permanence sur tout."
    ],
    "casserole": [
      "[…] passage à l'acte évité le week-end dernier."
    ],
    "mort": [
      "[…] passage à l'acte évité le week-end dernier."
    ],
    "heros": [
      "Nous devons continuer à garder cette flamme olympique, celle qui a vibré au sein de nos foyers."
    ]
  },
  "ndiaye": {
    "pose": [
      "Nous avons conscience que nos concitoyens ne mangent pas du homard tous les jours. Bien souvent c'est plutôt des kebabs.",
      "C'est pas du travail de journaliste, c'est du travail de sagouin !"
    ],
    "celebration": [
      "Nous avons conscience que nos concitoyens ne mangent pas du homard tous les jours. Bien souvent c'est plutôt des kebabs.",
      "Si vous n'êtes pas contente, je vous sors du pool."
    ],
    "casserole": [
      "J'assume parfaitement de mentir pour protéger le président."
    ]
  },
  "bregeon": {
    "celebration": [
      "À eux de décider s'ils veulent d'une France sans budget ni gouvernement."
    ],
    "mort": [
      "À eux de décider s'ils veulent d'une France sans budget ni gouvernement.",
      "Sans budget, on prend le risque d'un scénario à la grecque."
    ],
    "pose": [
      "C'est à la fois vertigineux et très enthousiasmant."
    ],
    "heros": [
      "C'est à la fois vertigineux et très enthousiasmant."
    ]
  },
  "maillard": {
    "celebration": [
      "Je suis dans la vie réelle, tout simplement.",
      "L'essentiel, c'est la dynamique."
    ],
    "pose": [
      "Je suis dans la vie réelle, tout simplement."
    ],
    "casserole": [
      "Je redis que mes propos étaient maladroits mais j'aurais aimé qu'on les prenne dans leur intégralité."
    ],
    "mort": [
      "Je redis que mes propos étaient maladroits mais j'aurais aimé qu'on les prenne dans leur intégralité.",
      "L'essentiel, c'est la dynamique."
    ]
  },
  "castaner": {
    "casserole": [
      "On a attaqué un hôpital."
    ],
    "pose": [
      "On a attaqué un hôpital."
    ]
  },
  "oudea": {
    "casserole": [
      "Si je rapporte ma rémunération actuelle au volume d'heures que chaque semaine je m'enfourne, en bossant jour, nuit, week-ends, je ne suis pas bien payée.",
      "Des paquets d'heures qui n'étaient pas sérieusement remplacées."
    ],
    "pose": [
      "Des paquets d'heures qui n'étaient pas sérieusement remplacées."
    ]
  },
  "rugy": {
    "celebration": [
      "C'est n'importe quoi ! Qu'ils me le montrent, ce sèche-cheveux !"
    ],
    "casserole": [
      "C'est n'importe quoi ! Qu'ils me le montrent, ce sèche-cheveux !",
      "Je n'ai pas de raison de démissionner.",
      "J'en ai plus que marre de voir qu'on essaye de me tailler un portrait de Monsieur DE Rugy, et de sa femme, qui vivent la vie de château.",
      "Je suis victime d'une tricherie du propriétaire et de l'agence immobilière."
    ],
    "mort": [
      "Je n'ai pas de raison de démissionner.",
      "C'est le fantasme du coupage de têtes !"
    ],
    "pose": [
      "J'en ai plus que marre de voir qu'on essaye de me tailler un portrait de Monsieur DE Rugy, et de sa femme, qui vivent la vie de château."
    ],
    "prison": [
      "C'est le fantasme du coupage de têtes !"
    ]
  },
  "schiappa": {
    "celebration": [
      "Tu n'es qu'un sac à main de seconde main.",
      "On ne va pas interdire les plans à trois, l'infidélité, le polyamour, les trouples […]"
    ],
    "casserole": [
      "À ma connaissance, je ne suis accusée de rien.",
      "Je ne me dérobe pas, j'entends endosser ma responsabilité, toute ma responsabilité mais aussi rien que ma responsabilité."
    ],
    "prison": [
      "À ma connaissance, je ne suis accusée de rien."
    ],
    "mort": [
      "Je ne me dérobe pas, j'entends endosser ma responsabilité, toute ma responsabilité mais aussi rien que ma responsabilité."
    ],
    "pose": [
      "On ne va pas interdire les plans à trois, l'infidélité, le polyamour, les trouples […]",
      "Rentrer dans le moule, c'est l'ambition d'une tarte."
    ],
    "heros": [
      "Rentrer dans le moule, c'est l'ambition d'une tarte."
    ]
  },
  "berge": {
    "casserole": [
      "C'est surtout une copine :) Elle sera très aidante avec moi."
    ],
    "celebration": [
      "C'est surtout une copine :) Elle sera très aidante avec moi."
    ]
  },
  "dupond_moretti": {
    "casserole": [
      "Si vous l'avez pris pour vous, je regrette ce geste. Mais lorsque je fais ce double geste, je l'ai dit, c'est un bras d'honneur à la présomption d'innocence.",
      "On est chez les dingues."
    ],
    "celebration": [
      "Si vous l'avez pris pour vous, je regrette ce geste. Mais lorsque je fais ce double geste, je l'ai dit, c'est un bras d'honneur à la présomption d'innocence."
    ],
    "pose": [
      "On est chez les dingues."
    ],
    "mort": [
      "Je suis mort de trouille."
    ]
  },
  "lemaire": {
    "pose": [
      "Nous allons provoquer l'effondrement de l'économie russe.",
      "Mon intelligence est un obstacle."
    ],
    "celebration": [
      "Nous allons provoquer l'effondrement de l'économie russe."
    ],
    "heros": [
      "Mon intelligence est un obstacle.",
      "Emmanuel Macron, c'est toujours une idéologie qui a planté la France."
    ],
    "mort": [
      "Emmanuel Macron, c'est toujours une idéologie qui a planté la France."
    ]
  },
  "darmanin": {
    "celebration": [
      "[…] en vient quasiment à être dans la mollesse je trouve... Il vous faut prendre des vitamines, je ne vous trouve pas assez dure là."
    ],
    "pose": [
      "Quand j'entends le mot « violences policières », moi, personnellement, je m'étouffe.",
      "Si je suis Maire de Tourcoing, je ne célébrerai pas personnellement de mariages entre 2 hommes et 2 femmes."
    ],
    "mort": [
      "Quand j'entends le mot « violences policières », moi, personnellement, je m'étouffe.",
      "M. Macron n'aura pas de majorité, ou alors de circonstances, et cela durera ce que durent les amours de vacances."
    ],
    "casserole": [
      "Si je suis Maire de Tourcoing, je ne célébrerai pas personnellement de mariages entre 2 hommes et 2 femmes.",
      "30 000 à 40 000 supporters anglais, soit sans billet, soit avec des billets falsifiés."
    ],
    "heros": [
      "M. Macron n'aura pas de majorité, ou alors de circonstances, et cela durera ce que durent les amours de vacances."
    ]
  },
  "philippe": {
    "casserole": [
      "Non, seulement les emmerdes.",
      "Je ne suis pas certain de comprendre la question. Vous voulez connaître mon taux horaire au jour de l'élection ? Ma rémunération mensuelle moyenne ? Annuelle ?"
    ],
    "pose": [
      "Non, seulement les emmerdes.",
      "Je serai candidat à la prochaine élection présidentielle."
    ],
    "heros": [
      "Je serai candidat à la prochaine élection présidentielle."
    ]
  },
  "lecornu": {
    "celebration": [
      "Je ne cours pas après le job.",
      "J'ai décidé de retirer la suppression de deux jours fériés."
    ],
    "heros": [
      "Je ne cours pas après le job."
    ],
    "mort": [
      "Ce soir, je considère que ma mission est terminée."
    ]
  },
  "bayrou": {
    "celebration": [
      "Tu ne me fais pas les poches."
    ],
    "casserole": [
      "Tu ne me fais pas les poches."
    ],
    "pose": [
      "Combien y a-t-il d'étoiles dans le système solaire ? Il y en a, si je ne me trompe pas, entre 200 et 400 milliards."
    ],
    "mort": [
      "Combien y a-t-il d'étoiles dans le système solaire ? Il y en a, si je ne me trompe pas, entre 200 et 400 milliards."
    ]
  },
  "attal": {
    "celebration": [
      "Tu casses, tu répares ; tu salis, tu nettoies ; tu défies l'autorité, on t'apprend à la respecter !",
      "France rime avec puissance."
    ],
    "pose": [
      "Tu casses, tu répares ; tu salis, tu nettoies ; tu défies l'autorité, on t'apprend à la respecter !",
      "Alors oui, j'assume de le dire : il faut désmicardiser la France.",
      "France rime avec puissance.",
      "Je suis né en 1989, l'année du bicentenaire de la Révolution."
    ],
    "heros": [
      "Je suis né en 1989, l'année du bicentenaire de la Révolution."
    ]
  },
  "macron": {
    "celebration": [
      "Ce que vous proposez, comme d'habitude, c'est de la poudre de perlimpinpin.",
      "S'ils veulent un responsable, il est devant vous, qu'ils viennent le chercher.",
      "Vous n'allez pas me faire peur avec votre tee-shirt. La meilleure façon de se payer un costard, c'est de travailler !"
    ],
    "pose": [
      "Hôtels, cafés, restaurants, je traverse la rue, je vous en trouve !",
      "Vous n'allez pas me faire peur avec votre tee-shirt. La meilleure façon de se payer un costard, c'est de travailler !",
      "Une gare, c'est un lieu où on croise les gens qui réussissent et les gens qui ne sont rien […]"
    ],
    "casserole": [
      "Hôtels, cafés, restaurants, je traverse la rue, je vous en trouve !",
      "S'ils veulent un responsable, il est devant vous, qu'ils viennent le chercher."
    ],
    "prison": [
      "S'ils veulent un responsable, il est devant vous, qu'ils viennent le chercher."
    ]
  },
  "gueant": {
    "celebration": [
      "Contrairement à ce que dit l'idéologie relativiste de gauche, pour nous, toutes les civilisations ne se valent pas.",
      "Heureusement, le Président a pris la tête de la croisade pour mobiliser le Conseil de sécurité des Nations unies et puis la Ligue arabe et l'Union africaine."
    ],
    "pose": [
      "Contrairement à ce que dit l'idéologie relativiste de gauche, pour nous, toutes les civilisations ne se valent pas.",
      "Heureusement, le Président a pris la tête de la croisade pour mobiliser le Conseil de sécurité des Nations unies et puis la Ligue arabe et l'Union africaine.",
      "Les Français, à force d'immigration incontrôlée, ont parfois le sentiment de ne plus être chez eux.",
      "[…] deux tiers des échecs scolaires, c'est l'échec d'enfants d'immigrés."
    ],
    "mort": [
      "[…] deux tiers des échecs scolaires, c'est l'échec d'enfants d'immigrés."
    ]
  },
  "tiberi": {
    "casserole": [
      "Pour l'instant ce sont des accusations, il n'y a aucune preuve, je ne veux pas engager de discussions…"
    ],
    "pose": [
      "Pour l'instant ce sont des accusations, il n'y a aucune preuve, je ne veux pas engager de discussions…"
    ]
  },
  "balkany": {
    "casserole": [
      "J'ai surtout l'impression aujourd'hui qu'on fait le procès des Juifs qui après la Libération ont pris leurs dispositions."
    ],
    "prison": [
      "J'ai surtout l'impression aujourd'hui qu'on fait le procès des Juifs qui après la Libération ont pris leurs dispositions."
    ]
  },
  "hortefeux": {
    "celebration": [
      "Il en faut toujours un. Quand il y en a un, ça va. C'est quand il y en a beaucoup qu'il y a des problèmes."
    ],
    "pose": [
      "Il en faut toujours un. Quand il y en a un, ça va. C'est quand il y en a beaucoup qu'il y a des problèmes.",
      "Il ne correspond pas du tout au prototype, alors."
    ],
    "mort": [
      "Il ne correspond pas du tout au prototype, alors."
    ]
  },
  "cope": {
    "celebration": [
      "Je pense que ça doit être aux alentours de 10 ou 15 centimes d'euro."
    ],
    "pose": [
      "Je pense que ça doit être aux alentours de 10 ou 15 centimes d'euro.",
      "[…] leur fils s'est fait arracher son pain au chocolat à la sortie du collège par des voyous qui lui expliquent qu'on ne mange pas pendant le ramadan.",
      "Un « racisme anti-Blanc » se développe dans les quartiers de nos villes […]"
    ]
  },
  "morano": {
    "pose": [
      "Nous sommes un pays judéo-chrétien, le général de Gaulle le disait, de race blanche, qui accueille des personnes étrangères.",
      "[…] ma meilleure amie qui est tchadienne et donc plus noire qu'une Arabe.",
      "Moi, ce que je veux du jeune musulman, quand il est français, […] c'est qu'il ne parle pas le verlan, qu'il ne mette pas sa casquette à l'envers."
    ],
    "celebration": [
      "Nous sommes un pays judéo-chrétien, le général de Gaulle le disait, de race blanche, qui accueille des personnes étrangères."
    ],
    "casserole": [
      "[…] ma meilleure amie qui est tchadienne et donc plus noire qu'une Arabe."
    ]
  },
  "lisnard": {
    "celebration": [
      "Le système est mort."
    ],
    "heros": [
      "Le système est mort."
    ],
    "pose": [
      "Le système est mort.",
      "Mais enfin, il n'a pas de gosse."
    ],
    "casserole": [
      "C'est très grave, c'est dramatique, mais c'était en 61."
    ],
    "mort": [
      "C'est très grave, c'est dramatique, mais c'était en 61."
    ]
  },
  "wauquiez": {
    "celebration": [
      "Vous avez vu les guignols d'En Marche ?",
      "Il fait 5 degrés de moyenne pendant l'année, 146 jours de pluie et de neige."
    ],
    "pose": [
      "Vous avez vu les guignols d'En Marche ?",
      "Il fait 5 degrés de moyenne pendant l'année, 146 jours de pluie et de neige.",
      "Donc il y a une dictature totale en France.",
      "Mais je ne suis pas là pour plaire."
    ],
    "mort": [
      "Je sens bien qu'il y a un tir de barrage contre moi en ce moment."
    ],
    "casserole": [
      "Je sens bien qu'il y a un tir de barrage contre moi en ce moment."
    ],
    "heros": [
      "Mais je ne suis pas là pour plaire."
    ]
  },
  "bertrand": {
    "celebration": [
      "On est deux en France à avoir battu madame Le Pen, Monsieur Macron et moi.",
      "Le gouvernement de Mme Borne est aussi expert en justice que moi en régime amincissant."
    ],
    "heros": [
      "On est deux en France à avoir battu madame Le Pen, Monsieur Macron et moi.",
      "[…] bien l'intention d'être candidat."
    ],
    "pose": [
      "Le gouvernement de Mme Borne est aussi expert en justice que moi en régime amincissant.",
      "Il faut lui enlever les mains du volant parce qu'il va finir par nous mettre dans le ravin.",
      "[…] bien l'intention d'être candidat."
    ]
  },
  "ciotti": {
    "celebration": [
      "Je ne regrette rien, j'assume mes choix."
    ],
    "casserole": [
      "Je ne regrette rien, j'assume mes choix."
    ],
    "heros": [
      "Je ne regrette rien, j'assume mes choix.",
      "Entre Macron et Zemmour, je le dis : je préfère Zemmour.",
      "Je me bats dans ma famille politique, je ne l'ai jamais quittée, j'ai adhéré au RPR à 16 ans, en 1981."
    ],
    "pose": [
      "Ce qui nous différencie du RN, c'est notre capacité à gouverner.",
      "Entre Macron et Zemmour, je le dis : je préfère Zemmour."
    ],
    "mort": [
      "Ce qui nous différencie du RN, c'est notre capacité à gouverner.",
      "Je me bats dans ma famille politique, je ne l'ai jamais quittée, j'ai adhéré au RPR à 16 ans, en 1981."
    ]
  },
  "retailleau": {
    "celebration": [
      "Je ne regrette rien du tout, je n'enlève rien du tout.",
      "Elle a un avantage, elle n'est pas chère."
    ],
    "casserole": [
      "Je ne regrette rien du tout, je n'enlève rien du tout."
    ],
    "pose": [
      "Malheureusement pour la deuxième, la troisième génération, il y a comme une sorte de régression vers les origines ethniques.",
      "L'État de droit, ça n'est pas intangible ni sacré.",
      "Elle a un avantage, elle n'est pas chère."
    ],
    "heros": [
      "L'État de droit, ça n'est pas intangible ni sacré."
    ],
    "mort": [
      "De toutes façons qu'est-ce qu'on risque ?"
    ]
  },
  "pecresse": {
    "mort": [
      "Je suis endettée personnellement à hauteur de 5 millions d'euros."
    ],
    "heros": [
      "Je suis endettée personnellement à hauteur de 5 millions d'euros.",
      "Je suis 2/3 Merkel et 1/3 Thatcher."
    ],
    "casserole": [
      "Je suis endettée personnellement à hauteur de 5 millions d'euros."
    ],
    "pose": [
      "Je suis 2/3 Merkel et 1/3 Thatcher."
    ]
  },
  "fillon": {
    "celebration": [
      "J'espère au moins que la farine était française !"
    ],
    "mort": [
      "J'espère au moins que la farine était française !",
      "Je suis à la tête d'un État qui est en situation de faillite."
    ],
    "pose": [
      "Qui imagine un seul instant le général de Gaulle mis en examen ?",
      "Il ne sert à rien de parler d'autorité quand on n'est pas soi-même irréprochable !"
    ],
    "casserole": [
      "Qui imagine un seul instant le général de Gaulle mis en examen ?"
    ],
    "heros": [
      "Il ne sert à rien de parler d'autorité quand on n'est pas soi-même irréprochable !",
      "Je suis à la tête d'un État qui est en situation de faillite."
    ]
  },
  "dati": {
    "pose": [
      "[…] une fellation quasi nulle […]"
    ],
    "celebration": [
      "[…] une fellation quasi nulle […]"
    ],
    "heros": [
      "Je serai quoi qu'il arrive candidate."
    ],
    "mort": [
      "Je serai quoi qu'il arrive candidate."
    ],
    "casserole": [
      "Je n'ai rien à cacher."
    ]
  },
  "sarkozy": {
    "celebration": [
      "Eh ben casse-toi alors, pauv' con !",
      "Vous en avez assez de cette bande de racailles ? Eh bien on va vous en débarrasser."
    ],
    "mort": [
      "Eh ben casse-toi alors, pauv' con !",
      "Il est temps pour moi d'aborder une vie avec plus de passion privée et moins de passion publique."
    ],
    "pose": [
      "Vous en avez assez de cette bande de racailles ? Eh bien on va vous en débarrasser.",
      "Dès demain, on va nettoyer au Kärcher la cité."
    ],
    "heros": [
      "Il est temps pour moi d'aborder une vie avec plus de passion privée et moins de passion publique."
    ]
  },
  "odoul": {
    "celebration": [
      "Je ne suis pas blonde, moi."
    ],
    "pose": [
      "Je ne suis pas blonde, moi.",
      "Est-ce que la corde est française ?",
      "C'est peut-être pour célébrer quelque chose."
    ]
  },
  "houssin": {
    "mort": [
      "On peut espérer l'emporter au second tour."
    ],
    "pose": [
      "Cette mesure serait intenable pour les ménages qui ont investi dans un véhicule adapté pour réduire leurs dépenses."
    ]
  },
  "chenu": {
    "pose": [
      "[…] l'UMP est devenu le Tea Party à la française. Ils sont beaucoup plus conservateurs que le FN-RBM."
    ],
    "heros": [
      "[…] l'UMP est devenu le Tea Party à la française. Ils sont beaucoup plus conservateurs que le FN-RBM."
    ]
  },
  "lavalette": {
    "pose": [
      "Un héros français et chrétien qui a porté jusqu'au bout l'idéal du sacrifice."
    ]
  },
  "tanguy": {
    "celebration": [
      "[…] il y a un flagrant délit de faillite, vous êtes de toute évidence coupable.",
      "Je suis honoré de la confiance des électeurs, mais j'accueille ce résultat avec beaucoup d'humilité et beaucoup de distance."
    ],
    "pose": [
      "[…] il y a un flagrant délit de faillite, vous êtes de toute évidence coupable.",
      "Voilà qu'un quarteron de procureurs et de juges prétend sortir du droit pour exercer la vendetta du système […] !",
      "Oui, le travail rend libre."
    ],
    "prison": [
      "Voilà qu'un quarteron de procureurs et de juges prétend sortir du droit pour exercer la vendetta du système […] !"
    ],
    "casserole": [
      "Oui, le travail rend libre."
    ],
    "heros": [
      "Je suis honoré de la confiance des électeurs, mais j'accueille ce résultat avec beaucoup d'humilité et beaucoup de distance."
    ]
  },
  "aliot": {
    "pose": [
      "Jaurès aurait voté Front national."
    ],
    "celebration": [
      "Jaurès aurait voté Front national."
    ],
    "casserole": [
      "[…] interjeter appel dans les plus brefs délais et avec la ferme détermination de gommer cette injustice."
    ],
    "prison": [
      "[…] interjeter appel dans les plus brefs délais et avec la ferme détermination de gommer cette injustice."
    ]
  },
  "marechal": {
    "pose": [
      "C'est un homme intéressant pour le débat public. Il va bousculer un peu tout le monde.",
      "Si la famille n'est pas défendue, il n'est pas impossible que dans 60 ans la France devienne une République islamique."
    ],
    "heros": [
      "C'est un homme intéressant pour le débat public. Il va bousculer un peu tout le monde."
    ],
    "celebration": [
      "C'est un homme intéressant pour le débat public. Il va bousculer un peu tout le monde."
    ]
  },
  "bardella": {
    "celebration": [
      "Le meilleur allié de l'écologie, c'est la frontière."
    ],
    "pose": [
      "Le meilleur allié de l'écologie, c'est la frontière."
    ],
    "casserole": [
      "Des faux grossiers."
    ]
  },
  "jmlp": {
    "celebration": [
      "Socialement je suis de gauche, économiquement je suis de droite, nationalement je suis de France !",
      "Chirac, c'est Jospin en pire."
    ],
    "pose": [
      "Socialement je suis de gauche, économiquement je suis de droite, nationalement je suis de France !",
      "Chirac, c'est Jospin en pire.",
      "[…] je crois que c'est un point de détail de l'histoire de la Deuxième Guerre mondiale.",
      "M. Durafour-crématoire, merci de cet aveu.",
      "Mgr Ebola peut régler ça en trois mois."
    ],
    "heros": [
      "Socialement je suis de gauche, économiquement je suis de droite, nationalement je suis de France !"
    ],
    "casserole": [
      "[…] je crois que c'est un point de détail de l'histoire de la Deuxième Guerre mondiale."
    ]
  },
  "lepen": {
    "celebration": [
      "De toute façon la France sera dirigée par une femme : ce sera, ou moi, ou Madame Merkel.",
      "Vous avez un talent fou : vous arrivez à parler sept minutes, je suis incapable de résumer votre pensée !",
      "Nicolas Sarkozy, c'est Barbapapa : il peut se transformer en patriote, en centriste […]"
    ],
    "pose": [
      "De toute façon la France sera dirigée par une femme : ce sera, ou moi, ou Madame Merkel.",
      "Vous avez un talent fou : vous arrivez à parler sept minutes, je suis incapable de résumer votre pensée !",
      "Certes il n'y a pas de blindés, il n'y a pas de soldats, mais c'est une occupation tout de même.",
      "Nicolas Sarkozy, c'est Barbapapa : il peut se transformer en patriote, en centriste […]"
    ],
    "casserole": [
      "Ah bon, et pourquoi pas le reste ?"
    ],
    "prison": [
      "Ah bon, et pourquoi pas le reste ?"
    ],
    "heros": [
      "Ah bon, et pourquoi pas le reste ?"
    ]
  },
  "zemmour": {
    "celebration": [
      "Ça rigole plus, là ? Poussez-vous ! Reculez !",
      "Et bien profond."
    ],
    "pose": [
      "Ça rigole plus, là ? Poussez-vous ! Reculez !",
      "Votre mère a eu tort.",
      "Ils n'ont rien à faire ici, ils sont voleurs, ils sont assassins, ils sont violeurs, c'est tout ce qu'ils sont."
    ],
    "mort": [
      "Et bien profond.",
      "Je ne me tromperai pas d'adversaire."
    ],
    "heros": [
      "Je ne me tromperai pas d'adversaire."
    ]
  },
  "mitterrand": {
    "celebration": [
      "Mais vous avez tout à fait raison, monsieur le Premier ministre.",
      "[…] dans l'intervalle vous soyez devenu, vous, l'homme du passif […]"
    ],
    "pose": [
      "Mais vous avez tout à fait raison, monsieur le Premier ministre.",
      "Je ne suis pas votre élève."
    ],
    "casserole": [
      "Dans les yeux, je la conteste.",
      "Je ne suis pas votre élève."
    ],
    "mort": [
      "Je crois aux forces de l'esprit et je ne vous quitterai pas."
    ],
    "heros": [
      "Je crois aux forces de l'esprit et je ne vous quitterai pas."
    ]
  },
  "chirac": {
    "celebration": [
      "Je décide et il exécute.",
      "Qu'est-ce qu'elle veut de plus, cette mégère ? Mes couilles sur un plateau ?",
      "Ce n'est pas qu'elles se dégonflent, c'est qu'elles font pschitt, si vous me permettez cette expression."
    ],
    "pose": [
      "Je décide et il exécute.",
      "Qu'est-ce qu'elle veut de plus, cette mégère ? Mes couilles sur un plateau ?",
      "Si vous ajoutez à cela le bruit et l'odeur, eh bien le travailleur français sur le palier devient fou."
    ],
    "heros": [
      "Je décide et il exécute."
    ],
    "casserole": [
      "Ce n'est pas qu'elles se dégonflent, c'est qu'elles font pschitt, si vous me permettez cette expression.",
      "Aujourd'hui, on rapporte une histoire abracadabrantesque."
    ],
    "mort": [
      "What do you want? Me to go back to my plane and go back to France?"
    ]
  },
  "poutou": {
    "prison": [
      "Nous, quand on est convoqué par la police, nous ouvriers, nous n'avons pas d'immunité ouvrière, désolé, on y va !"
    ],
    "casserole": [
      "Nous, quand on est convoqué par la police, nous ouvriers, nous n'avons pas d'immunité ouvrière, désolé, on y va !"
    ],
    "celebration": [
      "Nous, quand on est convoqué par la police, nous ouvriers, nous n'avons pas d'immunité ouvrière, désolé, on y va !",
      "François Fillon, que des histoires, plus on fouille plus on sent la corruption, la triche.",
      "Pour quelqu'un d'anti-européen, ça ne la gêne pas de piquer dans les caisses de l'Europe."
    ],
    "pose": [
      "François Fillon, que des histoires, plus on fouille plus on sent la corruption, la triche."
    ]
  },
  "roussel": {
    "pose": [
      "Franchement, vous n'allez pas me parler du sexe des escalopes quand même !",
      "Un bon vin, un bon fromage, une bonne viande, pour moi c'est la bonne gastronomie française.",
      "La gauche doit défendre le travail et le salaire, et ne pas être la gauche des allocations, minima sociaux et revenus de substitution."
    ],
    "celebration": [
      "Franchement, vous n'allez pas me parler du sexe des escalopes quand même !",
      "On mange de la viande en fonction de ce que l'on a dans le porte-monnaie, pas en fonction de ce qu'on a dans sa culotte ou dans son slip.",
      "Un bon vin, un bon fromage, une bonne viande, pour moi c'est la bonne gastronomie française."
    ]
  },
  "lassalle": {
    "heros": [
      "Oui, je serai candidat à la présidentielle de 2022, si je suis en bonne santé !"
    ],
    "pose": [
      "Oui, je serai candidat à la présidentielle de 2022, si je suis en bonne santé !"
    ]
  },
  "hanouna": {
    "victoire": [
      "Arrête de te la raconter ! Espèce d'abruti. Si t'es député c'est grâce à nous.",
      "On a été premier talk grâce à vous, tous les soirs, on a fait le max."
    ],
    "echelon": [
      "Arrête de te la raconter ! Espèce d'abruti. Si t'es député c'est grâce à nous."
    ],
    "elimination": [
      "Toi, t'es une merde.",
      "Tocard va, allez tais-toi ! Bouffon va !",
      "Mercredi, les chéris, ce sera la dernière de Touche pas à mon poste."
    ],
    "defaite": [
      "Toi, t'es une merde.",
      "Tocard va, allez tais-toi ! Bouffon va !",
      "Sur la séquence, je m'excuse pas du tout.",
      "Mercredi, les chéris, ce sera la dernière de Touche pas à mon poste."
    ],
    "achat": [
      "Tu sais que tu es dans le groupe Bolloré ici ? Qu'est-ce que tu viens foutre ici alors ?"
    ],
    "attente": [
      "Tu sais que tu es dans le groupe Bolloré ici ? Qu'est-ce que tu viens foutre ici alors ?"
    ]
  },
  "praud": {
    "attente": [
      "Il y a beaucoup d'immigration en ce moment. Est-ce que c'est les personnes qui n'ont pas les mêmes conditions d'hygiène […] ?",
      "Beaucoup de femmes n'ont pas eu la chance d'être regardées par les hommes et nourrissent parfois un sentiment de revanche."
    ],
    "actualiser": [
      "Il y a beaucoup d'immigration en ce moment. Est-ce que c'est les personnes qui n'ont pas les mêmes conditions d'hygiène […] ?"
    ],
    "defaite": [
      "Il y a une maladresse de ma part sur le mot immigration, je voulais dire les migrants."
    ]
  },
  "dupont_aignan": {
    "pose": [
      "On va mettre autour du cou des Français une laisse."
    ],
    "casserole": [
      "[…] auront moins de droits qu'un fiché S terroriste."
    ]
  },
  "knafo": {
    "celebration": [
      "Vous êtes le fils de, vous êtes le neveu de, etc. Donc, ça m'étonne beaucoup venant de vous !"
    ],
    "casserole": [
      "Vous êtes le fils de, vous êtes le neveu de, etc. Donc, ça m'étonne beaucoup venant de vous !",
      "On est vraiment sur BFM, c'est vous qui créez la polémique et c'est vous qui la relancez."
    ],
    "pose": [
      "On est vraiment sur BFM, c'est vous qui créez la polémique et c'est vous qui la relancez."
    ]
  },
  "villiers": {
    "celebration": [
      "Je suis fier d'avoir vu mon fils rembarrer tous ces chacals.",
      "Le roi est nu, il ne reste que le casque et le scooter."
    ],
    "casserole": [
      "J'ai renoncé à tous mes droits. Je n'ai jamais touché un centime."
    ],
    "pose": [
      "Le roi est nu, il ne reste que le casque et le scooter.",
      "L'atmosphère, c'est une atmosphère de pré-guerre civile.",
      "En 1914, c'est tout le monde dans la tranchée. Aujourd'hui, c'est tout le monde au supermarché."
    ],
    "mort": [
      "Moi, j'ai quitté la scène."
    ],
    "heros": [
      "Moi, j'ai quitté la scène."
    ]
  },
  "philippot": {
    "celebration": [
      "Il a menti, il a perdu.",
      "On a non plus un ministre de l'Intérieur mais un menteur de l'Intérieur."
    ],
    "pose": [
      "On a non plus un ministre de l'Intérieur mais un menteur de l'Intérieur."
    ]
  },
  "rigault": {
    "mort": [
      "J'espère que je ne suis pas juste le jeune de Zemmour qu'on envoie pour se faire tabasser."
    ],
    "casserole": [
      "Faut pas faire la vierge effarouchée."
    ],
    "pose": [
      "Je suis disponible et je n'ai pas peur du débat."
    ]
  },
  "bay": {
    "celebration": [
      "Mettre hors d'état de nuire les casseurs, la racaille."
    ],
    "pose": [
      "Mettre hors d'état de nuire les casseurs, la racaille.",
      "C'est totalement mensonger […] nos candidats disent la vérité.",
      "De la racaille d'extrême-gauche."
    ],
    "casserole": [
      "C'est totalement mensonger […] nos candidats disent la vérité."
    ],
    "mort": [
      "A l'époque, je ne me suis pas du tout rendu compte. C'est un tort."
    ],
    "prison": [
      "A l'époque, je ne me suis pas du tout rendu compte. C'est un tort."
    ]
  },
  "peltier": {
    "celebration": [
      "Vive la France et vive la Sologne. Et longue vie aux saisons.",
      "Nous ne voulons plus du social qui nous ruine, nous voulons le travail qui rémunère !",
      "J'ai un adversaire, c'est la gauche."
    ],
    "mort": [
      "Tu vis, on te taxe ; tu meurs, on te taxe."
    ],
    "pose": [
      "Nous ne voulons plus du social qui nous ruine, nous voulons le travail qui rémunère !",
      "[…] avec beaucoup de gravité et d'enthousiasme.",
      "Vous préférez Dubaï à l'Aubrac, et votre horizon se nomme RSA pour les uns, GPA pour les autres.",
      "J'ai un adversaire, c'est la gauche."
    ],
    "heros": [
      "[…] avec beaucoup de gravité et d'enthousiasme."
    ]
  },
  "kazib": {
    "celebration": [
      "C'est inadmissible ce que tu racontes Olivier !"
    ],
    "pose": [
      "C'est inadmissible ce que tu racontes Olivier !",
      "Une candidature ouvrière, communiste et révolutionnaire à la présidentielle."
    ],
    "heros": [
      "Une candidature ouvrière, communiste et révolutionnaire à la présidentielle."
    ]
  },
  "cheminade": {
    "celebration": [
      "Un monde sans la City ni Wall Street.",
      "[…] l'oligarchie des incapables."
    ],
    "heros": [
      "Un monde sans la City ni Wall Street."
    ],
    "pose": [
      "On a tué Ben Laden et Khadafi pour qu'ils ne parlent pas.",
      "[…] l'oligarchie des incapables."
    ],
    "casserole": [
      "On a tué Ben Laden et Khadafi pour qu'ils ne parlent pas."
    ]
  },
  "durif": {
    "pose": [
      "J'incarne l'énergie du Christ cosmique."
    ],
    "heros": [
      "J'incarne l'énergie du Christ cosmique."
    ]
  },
  "lalanne": {
    "celebration": [
      "Citoyennes et Citoyens de la France ! La Patrie est en danger"
    ],
    "pose": [
      "Citoyennes et Citoyens de la France ! La Patrie est en danger",
      "Le chef de l'État et son gouvernement s'essuient les pieds sur le Droit Républicain comme sur un paillasson."
    ],
    "heros": [
      "Citoyennes et Citoyens de la France ! La Patrie est en danger"
    ],
    "casserole": [
      "Le chef de l'État et son gouvernement s'essuient les pieds sur le Droit Républicain comme sur un paillasson."
    ],
    "mort": [
      "Il doit donc être destitué"
    ]
  },
  "arthaud": {
    "celebration": [
      "Cela ne peut que déclencher des révoltes et des coups de colère."
    ],
    "pose": [
      "Quand on est salarié, on ne doit pas accepter de s'appauvrir."
    ]
  },
  "branco": {
    "celebration": [
      "Ils ne sont pas corrompus, ils sont la corruption.",
      "Votre émission est pornographique !",
      "2027, c'est demain !"
    ],
    "pose": [
      "Ils ne sont pas corrompus, ils sont la corruption.",
      "Votre émission est pornographique !",
      "Comment fabriquer une guillotine"
    ],
    "heros": [
      "2027, c'est demain !"
    ]
  },
  "barthes": {
    "defaite": [
      "Tout le monde s'en fout."
    ],
    "elimination": [
      "Tout le monde s'en fout."
    ]
  },
  "duhamel": {
    "defaite": [
      "[…] jusqu'à preuve du contraire, ce n'est pas, ni ma mère, mon père ou mon oncle, qui m'a permis de faire le métier que je fais.",
      "Excusez-moi, vous mettez en cause ma probité !"
    ],
    "echelon": [
      "[…] jusqu'à preuve du contraire, ce n'est pas, ni ma mère, mon père ou mon oncle, qui m'a permis de faire le métier que je fais."
    ],
    "achat": [
      "On connaissait au Rassemblement national la politique de père en fille. À Reconquête, la politique se fait en couple ?"
    ],
    "attente": [
      "On connaissait au Rassemblement national la politique de père en fille. À Reconquête, la politique se fait en couple ?",
      "La question est sans aucune polémique, Sarah Knafo."
    ],
    "actualiser": [
      "La question est sans aucune polémique, Sarah Knafo."
    ]
  },
  "ppda": {
    "defaite": [
      "Mais je n'allais pas lui réinventer une vie !"
    ]
  }
};

/** Une phrase de cette personne pour ce moment : la première pour la Célébration, sinon au tour suivant. */
export function phraseFor(id: string, moment: Moment, turn = 0): string | null {
  const list = PHRASES[id]?.[moment];
  if (!list || list.length === 0) return null;
  return list[turn % list.length];
}
