/**
 * Les petites phrases du jeu, par personne et par moment : seulement les citations vérifiées,
 * mot pour mot. Généré par tools/phrases/genere.ts depuis data/collecte/petites_phrases_*.json et saillies/*.json :
 * ne pas modifier à la main. Les sources sont dans la collecte, et dans docs/gameplay/petites-phrases.md.
 */
export type Moment = 'pose' | 'casserole' | 'prison' | 'mort' | 'celebration' | 'heros' | 'achat' | 'actualiser' | 'echelon' | 'triple' | 'victoire' | 'defaite' | 'elimination' | 'attente';

export const PHRASES: Record<string, Partial<Record<Moment, string[]>>> = {
  "thevenoud": {
    "casserole": [
      "J'ai soigné ma phobie administrative.",
      "Phobie administrative.",
      "La phobie administrative touche plus de gens que l'on ne le croit."
    ],
    "celebration": [
      "J'ai soigné ma phobie administrative."
    ],
    "heros": [
      "Phobie administrative."
    ],
    "pose": [
      "La phobie administrative touche plus de gens que l'on ne le croit.",
      "Phobie administrative."
    ]
  },
  "bouamrane": {
    "pose": [
      "LFI est un parti colonialiste.",
      "Entre Goebbels et Staline, j'aurais choisi De Gaulle, moi.",
      "LFI discute avec des dictateurs. Je ne peux pas transiger avec ça."
    ],
    "heros": [
      "Entre Goebbels et Staline, j'aurais choisi De Gaulle, moi.",
      "Parce que nous avons pris conscience de notre force."
    ],
    "celebration": [
      "LFI est un parti colonialiste.",
      "Ils passent leur temps à parler du travail, ils n'ont jamais travaillé.",
      "Je n'irai pas contre lui : celui qui sera désigné, il me soutiendra.",
      "Vous voulez être président de la République, vous vous retrouvez avec un tablier en train de servir des frites ?",
      "Parce que nous avons pris conscience de notre force."
    ],
    "mort": [
      "Je n'irai pas contre lui : celui qui sera désigné, il me soutiendra."
    ]
  },
  "guedj": {
    "pose": [
      "Pour la première fois de ma vie, j'ai dû dire de l'homme que j'ai aimé profondément qu'il est devenu un salopard antisémite.",
      "On serait masochistes de faire des accords avec LFI qui veut faire la peau aux socialistes !",
      "La République c'est nous !",
      "Il n'y a pas que Jean-Luc Mélenchon dans la vie politique, c'est un non-événement."
    ],
    "casserole": [
      "On serait masochistes de faire des accords avec LFI qui veut faire la peau aux socialistes !",
      "Malheur à celui qui fait péter la NUPES."
    ],
    "heros": [
      "Pour la première fois de ma vie, j'ai dû dire de l'homme que j'ai aimé profondément qu'il est devenu un salopard antisémite.",
      "La République c'est nous !"
    ],
    "celebration": [
      "La République c'est nous !",
      "Il n'y a pas que Jean-Luc Mélenchon dans la vie politique, c'est un non-événement."
    ],
    "mort": [
      "Malheur à celui qui fait péter la NUPES.",
      "Je félicite Raphaël Glucksmann pour sa victoire."
    ]
  },
  "cahuzac": {
    "prison": [
      "Ce compte, c'est du financement d'activités politiques.",
      "Pourquoi démissionner quand on se sait innocent ?",
      "J'ai été pris dans une spirale du mensonge et m'y suis fourvoyé. Je suis dévasté par le remords."
    ],
    "casserole": [
      "Je n'ai pas, monsieur le député, je n'ai jamais eu de compte à l'étranger, ni maintenant, ni auparavant.",
      "Je n'ai pas, je n'ai jamais eu de compte en Suisse, Jean-Jacques Bourdin. À aucun moment.",
      "Ce compte, c'est du financement d'activités politiques.",
      "Depuis le début, c'est moi qui dis la vérité.",
      "Pourquoi démissionner quand on se sait innocent ?",
      "Je n'ai pas, je n'ai jamais eu de compte en Suisse, Jean-Jacques Bourdin."
    ],
    "heros": [
      "Je n'ai pas, monsieur le député, je n'ai jamais eu de compte à l'étranger, ni maintenant, ni auparavant."
    ],
    "pose": [
      "Je n'ai pas, monsieur le député, je n'ai jamais eu de compte à l'étranger, ni maintenant, ni auparavant.",
      "Depuis le début, c'est moi qui dis la vérité.",
      "Vous y croyez toujours, moi je n'y ai jamais cru."
    ],
    "mort": [
      "J'ai été pris dans une spirale du mensonge et m'y suis fourvoyé. Je suis dévasté par le remords."
    ],
    "celebration": [
      "Merci, monsieur le député, de m'avoir permis de le dire devant la représentation nationale."
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
    "casserole": [
      "Les Roms ont vocation à revenir en Roumanie ou en Bulgarie.",
      "Si c'était à refaire, je ne le referais pas.",
      "Donc je voterai pour Emmanuel Macron. Je prends mes responsabilités.",
      "Car expliquer, c'est déjà vouloir un peu excuser.",
      "Parfois, il y a des positions irréconciliables à gauche et il faut l'assumer."
    ],
    "pose": [
      "J'ai peur pour mon pays, qu'il se fracasse contre le FN.",
      "Les Roms ont vocation à revenir en Roumanie ou en Bulgarie.",
      "Marianne, le symbole de la République, elle a le sein nu parce qu'elle nourrit le peuple.",
      "[…] celle de l'extrême droite qui, au fond, prône la division. Cette division peut conduire à la guerre civile.",
      "Belle image de la ville d'Évry… Tu me mets quelques Blancs, quelques whites, quelques blancos.",
      "Un apartheid territorial, social, ethnique, s'est imposé à notre pays.",
      "Et moi, j'aime l'entreprise !",
      "Tu me mets quelques Blancs, quelques Whites, quelques Blancos !",
      "Car expliquer, c'est déjà vouloir un peu excuser."
    ],
    "mort": [
      "Oui, la gauche peut mourir.",
      "Donc je voterai pour Emmanuel Macron. Je prends mes responsabilités."
    ],
    "heros": [
      "Belle image de la ville d'Évry… Tu me mets quelques Blancs, quelques whites, quelques blancos."
    ],
    "celebration": [
      "Marianne, le symbole de la République, elle a le sein nu parce qu'elle nourrit le peuple.",
      "Et moi, j'aime l'entreprise !"
    ]
  },
  "faure": {
    "casserole": [
      "Sur la question européenne, nous ne pouvons pas être d'accord avec Jean-Luc Mélenchon, c'est impossible.",
      "Qu'ils aient un droit de regard... même si évidemment on ne va pas remplacer les juges par les policiers."
    ],
    "pose": [
      "Nous sommes volontaires pour être les suivants.",
      "Jean-Luc Mélenchon est devenu aujourd'hui le boulet de la gauche.",
      "Sur la question européenne, nous ne pouvons pas être d'accord avec Jean-Luc Mélenchon, c'est impossible.",
      "Vous fissurez toutes les digues qui, depuis le gouvernement provisoire du général de Gaulle, ont jusqu'ici protégé la République du nationalisme.",
      "[…] pas de sang sur les murs.",
      "Si rien ne bouge évidemment la censure est acquise."
    ],
    "celebration": [
      "Nous sommes volontaires pour être les suivants.",
      "Taisez-vous maintenant !"
    ],
    "heros": [
      "Taisez-vous maintenant !",
      "Je respecte trop le processus démocratique de la primaire pour ne pas l'accepter avec sagesse."
    ],
    "mort": [
      "Je respecte trop le processus démocratique de la primaire pour ne pas l'accepter avec sagesse.",
      "[…] pas de sang sur les murs."
    ]
  },
  "cazeneuve": {
    "celebration": [
      "Il se fait beaucoup de mal à lui-même. Je m'inquiète pour lui.",
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
    "pose": [
      "Quand on demande des listes de prisonniers politiques, on n'en a pas. Eh bien fournissez-moi des listes de prisonniers politiques.",
      "Il faut arrêter de manger du Nutella, par exemple, parce que c'est de l'huile de palme.",
      "Qui va sur la Grande Muraille conquiert la bravitude.",
      "Pardon pour ces paroles humiliantes et qui n'auraient jamais dû être prononcées et qui n'engagent pas la France.",
      "Je ne suis pas énervée. Je suis en colère.",
      "Un concours de laideur, de vulgarité et d'exhibitionnisme."
    ],
    "heros": [
      "Qui va sur la Grande Muraille conquiert la bravitude.",
      "Pardon pour ces paroles humiliantes et qui n'auraient jamais dû être prononcées et qui n'engagent pas la France."
    ],
    "celebration": [
      "Qui va sur la Grande Muraille conquiert la bravitude.",
      "C'est un monument de l'histoire, d'abord, Fidel Castro.",
      "Il faut arrêter de manger du Nutella, par exemple, parce que c'est de l'huile de palme."
    ],
    "casserole": [
      "Quand on demande des listes de prisonniers politiques, on n'en a pas. Eh bien fournissez-moi des listes de prisonniers politiques.",
      "Je ne suis pas énervée. Je suis en colère."
    ]
  },
  "glucksmann": {
    "heros": [
      "Rendez-nous la statue de la Liberté.",
      "On leur pisse dessus, on va pas rentrer dedans.",
      "Quand je vais à New-York ou à Berlin, je me sens plus chez moi culturellement, que quand je me rends en Picardie. Et c'est bien ça le problème."
    ],
    "pose": [
      "Rendez-nous la statue de la Liberté.",
      "Quand je vais à New-York ou à Berlin, je me sens plus chez moi culturellement, que quand je me rends en Picardie.",
      "On leur pisse dessus, on va pas rentrer dedans.",
      "Quand je vais à New-York ou à Berlin, je me sens plus chez moi culturellement, que quand je me rends en Picardie. Et c'est bien ça le problème."
    ],
    "celebration": [
      "Vive la France !",
      "On leur pisse dessus, on va pas rentrer dedans.",
      "Nous vous en avons fait cadeau, mais apparemment vous la méprisez. Elle sera donc très bien ici, à la maison."
    ],
    "casserole": [
      "Quand je vais à New-York ou à Berlin, je me sens plus chez moi culturellement, que quand je me rends en Picardie.",
      "Quand je vais à New-York ou à Berlin, je me sens plus chez moi culturellement, que quand je me rends en Picardie. Et c'est bien ça le problème."
    ]
  },
  "hollande": {
    "casserole": [
      "Les affaires privées se traitent en privé, dans une intimité respectueuse de chacun.",
      "Je ne peux pas comme président de la République supprimer la pluie.",
      "Oui, je n'aime pas les riches. Je n'aime pas les riches, j'en conviens."
    ],
    "pose": [
      "Gouverner, c'est pleuvoir.",
      "Be you, be proud of you because you can be do what we want to do.",
      "Moi, président de la République, je ne serai pas le chef de la majorité.",
      "Je ne peux pas comme président de la République supprimer la pluie.",
      "Jean-Luc Mélenchon, s'il veut rendre service au Nouveau Front populaire, il faut qu'il se mette de côté, qu'il se taise.",
      "Ils sont passés de gosses mal éduqués à vedettes richissimes, sans préparation.",
      "Mon véritable adversaire, il n'a pas de nom, pas de visage, pas de parti […]. Cet adversaire, c'est le monde de la finance.",
      "Oui, je n'aime pas les riches. Je n'aime pas les riches, j'en conviens.",
      "Mon véritable adversaire n'a pas de nom, pas de visage, pas de parti."
    ],
    "celebration": [
      "Gouverner, c'est pleuvoir.",
      "Be you, be proud of you because you can be do what we want to do.",
      "Moi, président de la République, je ne serai pas le chef de la majorité.",
      "Jean-Luc Mélenchon, s'il veut rendre service au Nouveau Front populaire, il faut qu'il se mette de côté, qu'il se taise.",
      "Mon véritable adversaire, il n'a pas de nom, pas de visage, pas de parti […]. Cet adversaire, c'est le monde de la finance.",
      "Ça va mieux.",
      "Il en revient sain et sauf, c'est déjà beaucoup !"
    ],
    "mort": [
      "J'ai décidé de ne pas être candidat à l'élection présidentielle, au renouvellement de mon mandat.",
      "Chaque fois qu'on remettait en cause le crime de lèse-majesté, de lèse-humanité…",
      "Voilà ce qui vous change, la mort habite la fonction présidentielle."
    ],
    "heros": [
      "Moi, président de la République, je ne serai pas le chef de la majorité.",
      "Mon véritable adversaire n'a pas de nom, pas de visage, pas de parti."
    ]
  },
  "arthaud": {
    "pose": [
      "Travailleuses, travailleurs !",
      "Le camp occidental, y compris notre propre gouvernement, a joué avec la peau des Ukrainiens.",
      "Quand on est salarié, on ne doit pas accepter de s'appauvrir."
    ],
    "heros": [
      "Travailleuses, travailleurs !"
    ],
    "celebration": [
      "Cela ne peut que déclencher des révoltes et des coups de colère."
    ]
  },
  "oudea": {
    "casserole": [
      "La frustration de parents, notre cas, qui ont vu des paquets d'heures qui n'étaient pas sérieusement remplacées.",
      "Même au sein du Parlement, on voudrait faire de moi le symbole d'une caste privilégiée à combattre, à abattre.",
      "Si je rapporte ma rémunération actuelle au volume d'heures que, chaque semaine, je m'enfourne, en bossant jour, nuit, week-ends, je ne suis pas bien payée.",
      "Si je rapporte ma rémunération actuelle au volume d'heures que chaque semaine je m'enfourne, en bossant jour, nuit, week-ends, je ne suis pas bien payée.",
      "Des paquets d'heures qui n'étaient pas sérieusement remplacées."
    ],
    "mort": [
      "Même au sein du Parlement, on voudrait faire de moi le symbole d'une caste privilégiée à combattre, à abattre."
    ],
    "heros": [
      "La frustration de parents, notre cas, qui ont vu des paquets d'heures qui n'étaient pas sérieusement remplacées."
    ],
    "pose": [
      "Si je rapporte ma rémunération actuelle au volume d'heures que, chaque semaine, je m'enfourne, en bossant jour, nuit, week-ends, je ne suis pas bien payée.",
      "Des paquets d'heures qui n'étaient pas sérieusement remplacées."
    ]
  },
  "poisson": {
    "mort": [
      "Je quitte ce plateau monsieur, je vous remercie de cette invitation. Nous nous reverrons bientôt."
    ],
    "casserole": [
      "Je quitte ce plateau monsieur, je vous remercie de cette invitation. Nous nous reverrons bientôt.",
      "[…] la proximité d'Hillary Clinton avec les super-financiers de Wall Street et sa soumission aux lobbies sionistes."
    ],
    "heros": [
      "[…] la proximité d'Hillary Clinton avec les super-financiers de Wall Street et sa soumission aux lobbies sionistes."
    ]
  },
  "jadot": {
    "heros": [
      "Alors là, vous me faites des colles, allez-y aidez-moi !",
      "Sarkozy, Hollande, Macron... Ils ont tous eu leur chance. Et ils ont tous échoué."
    ],
    "casserole": [
      "Alors là, vous me faites des colles, allez-y aidez-moi !"
    ],
    "pose": [
      "Ah ouais, ça c'est un piège ça !",
      "Alors là, c'est les pays baltes, c'est là que c'est très compliqué, on ne va pas se raconter d'histoire.",
      "Sarkozy, Hollande, Macron... Ils ont tous eu leur chance. Et ils ont tous échoué."
    ],
    "celebration": [
      "Dans le passé, on a été moqués, traités de catastrophistes ou d'utopistes […] d'un seul coup, tout le monde est devenu écolo."
    ],
    "mort": [
      "Alors là, c'est les pays baltes, c'est là que c'est très compliqué, on ne va pas se raconter d'histoire."
    ]
  },
  "barbier": {
    "achat": [
      "Je suis partisan de suspendre la cinquième semaine de congés payés jusqu'au jour où on aura rétabli nos comptes publics."
    ],
    "attente": [
      "Je suis partisan de suspendre la cinquième semaine de congés payés jusqu'au jour où on aura rétabli nos comptes publics.",
      "Quand on veut le risque zéro, on tue toute la vie, on se confine, on reste chez soi et on meurt."
    ],
    "defaite": [
      "Quand on veut le risque zéro, on tue toute la vie, on se confine, on reste chez soi et on meurt."
    ]
  },
  "gueant": {
    "heros": [
      "Contrairement à ce que dit l'idéologie relativiste de gauche, pour nous, toutes les civilisations ne se valent pas."
    ],
    "pose": [
      "Les Français, à force d'immigration incontrôlée, ont parfois le sentiment de ne plus être chez eux.",
      "Contrairement à ce que dit l'idéologie relativiste de gauche, pour nous, toutes les civilisations ne se valent pas.",
      "Heureusement, le Président a pris la tête de la croisade pour mobiliser le Conseil de sécurité des Nations unies […]",
      "[…] deux tiers des échecs scolaires, c'est l'échec d'enfants d'immigrés.",
      "Heureusement, le Président a pris la tête de la croisade pour mobiliser le Conseil de sécurité des Nations unies et puis la Ligue arabe et l'Union africaine."
    ],
    "celebration": [
      "Heureusement, le Président a pris la tête de la croisade pour mobiliser le Conseil de sécurité des Nations unies […]",
      "Contrairement à ce que dit l'idéologie relativiste de gauche, pour nous, toutes les civilisations ne se valent pas.",
      "Heureusement, le Président a pris la tête de la croisade pour mobiliser le Conseil de sécurité des Nations unies et puis la Ligue arabe et l'Union africaine."
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
    "heros": [
      "Il en faut toujours un. Quand il y en a un, ça va. C'est quand il y en a beaucoup qu'il y a des problèmes."
    ],
    "celebration": [
      "Il en faut toujours un. Quand il y en a un, ça va. C'est quand il y en a beaucoup qu'il y a des problèmes."
    ],
    "pose": [
      "Il ne correspond pas du tout au prototype, alors.",
      "Il en faut toujours un. Quand il y en a un, ça va. C'est quand il y en a beaucoup qu'il y a des problèmes."
    ],
    "mort": [
      "Il ne correspond pas du tout au prototype, alors."
    ]
  },
  "cope": {
    "heros": [
      "[…] leur fils s'est fait arracher son pain au chocolat à la sortie du collège par des voyous […]"
    ],
    "pose": [
      "Je pense que ça doit être aux alentours de 10 ou 15 centimes d'euro.",
      "[…] leur fils s'est fait arracher son pain au chocolat à la sortie du collège par des voyous […]",
      "Un « racisme anti-Blanc » se développe dans les quartiers de nos villes […]",
      "[…] leur fils s'est fait arracher son pain au chocolat à la sortie du collège par des voyous qui lui expliquent qu'on ne mange pas pendant le ramadan."
    ],
    "celebration": [
      "Je pense que ça doit être aux alentours de 10 ou 15 centimes d'euro."
    ]
  },
  "morano": {
    "heros": [
      "Alors que j'ai des amis qui sont justement arabes, ma meilleure amie qui est tchadienne, donc plus noire qu'une Arabe."
    ],
    "casserole": [
      "Alors que j'ai des amis qui sont justement arabes, ma meilleure amie qui est tchadienne, donc plus noire qu'une Arabe.",
      "Il ne faut rien dire parce qu'elle est noire, c'est ça ?",
      "[…] ma meilleure amie qui est tchadienne et donc plus noire qu'une Arabe."
    ],
    "pose": [
      "Nous sommes un pays judéo-chrétien, le général de Gaulle le disait, de race blanche, qui accueille des personnes étrangères.",
      "Ce que je veux du jeune musulman, […] c'est qu'il ne parle pas le verlan, qu'il ne mette pas sa casquette à l'envers.",
      "[…] inepties débitées souvent en tenue de cirque […]",
      "[…] ma meilleure amie qui est tchadienne et donc plus noire qu'une Arabe.",
      "Moi, ce que je veux du jeune musulman, quand il est français, […] c'est qu'il ne parle pas le verlan, qu'il ne mette pas sa casquette à l'envers."
    ],
    "celebration": [
      "Nous sommes un pays judéo-chrétien, le général de Gaulle le disait, de race blanche, qui accueille des personnes étrangères."
    ]
  },
  "lisnard": {
    "casserole": [
      "C'est très grave, c'est dramatique, mais c'était en 61."
    ],
    "mort": [
      "C'est très grave, c'est dramatique, mais c'était en 61."
    ],
    "pose": [
      "Mais enfin, il n'a pas de gosse.",
      "Le système est mort."
    ],
    "celebration": [
      "Le système est mort."
    ],
    "heros": [
      "Le système est mort."
    ]
  },
  "wauquiez": {
    "heros": [
      "Il fait 5 degrés de moyenne pendant l'année, 146 jours de pluie et de neige.",
      "Mais je ne suis pas là pour plaire."
    ],
    "pose": [
      "Il fait 5 degrés de moyenne pendant l'année, 146 jours de pluie et de neige.",
      "Vous avez vu les guignols d'En Marche ?",
      "Donc il y a une dictature totale en France.",
      "Mais je ne suis pas là pour plaire."
    ],
    "celebration": [
      "Il fait 5 degrés de moyenne pendant l'année, 146 jours de pluie et de neige.",
      "Vous avez vu les guignols d'En Marche ?"
    ],
    "casserole": [
      "Je sens bien qu'il y a un tir de barrage contre moi en ce moment."
    ],
    "mort": [
      "Je sens bien qu'il y a un tir de barrage contre moi en ce moment."
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
    ],
    "mort": [
      "Oh là là là là.",
      "Il faut lui enlever les mains du volant parce qu'il va finir par nous mettre dans le ravin."
    ],
    "defaite": [
      "Oh là là là là."
    ]
  },
  "ciotti": {
    "heros": [
      "Entre Macron et Zemmour, je le dis : je préfère Zemmour.",
      "Je ne regrette rien, j'assume mes choix.",
      "Je me bats dans ma famille politique, je ne l'ai jamais quittée, j'ai adhéré au RPR à 16 ans, en 1981."
    ],
    "pose": [
      "Nous avons besoin d'une alliance, tout en restant nous-mêmes, avec le Rassemblement national et ses candidats.",
      "Entre Macron et Zemmour, je le dis : je préfère Zemmour.",
      "Ce qui nous différencie du RN, c'est notre capacité à gouverner."
    ],
    "casserole": [
      "Nous avons besoin d'une alliance, tout en restant nous-mêmes, avec le Rassemblement national et ses candidats.",
      "Je suis et reste le président.",
      "Je ne regrette rien, j'assume mes choix."
    ],
    "celebration": [
      "Je suis et reste le président.",
      "Je ne regrette rien, j'assume mes choix."
    ],
    "mort": [
      "Je me bats dans ma famille politique, je ne l'ai jamais quittée, j'ai adhéré au RPR à 16 ans, en 1981.",
      "Ce qui nous différencie du RN, c'est notre capacité à gouverner."
    ]
  },
  "retailleau": {
    "pose": [
      "Rétablir l'ordre, rétablir l'ordre, rétablir l'ordre.",
      "Malheureusement pour la deuxième, la troisième génération, il y a comme une sorte de régression vers les origines ethniques.",
      "L'État de droit, ça n'est pas intangible ni sacré.",
      "Elle a un avantage, elle n'est pas chère."
    ],
    "heros": [
      "Malheureusement pour la deuxième, la troisième génération, il y a comme une sorte de régression vers les origines ethniques.",
      "L'État de droit, ça n'est pas intangible ni sacré."
    ],
    "celebration": [
      "Rétablir l'ordre, rétablir l'ordre, rétablir l'ordre.",
      "Je ne regrette rien du tout, je n'enlève rien du tout.",
      "Elle a un avantage, elle n'est pas chère."
    ],
    "casserole": [
      "Je ne regrette rien du tout, je n'enlève rien du tout."
    ],
    "mort": [
      "De toutes façons qu'est-ce qu'on risque ?"
    ]
  },
  "pecresse": {
    "heros": [
      "Je suis endettée personnellement à hauteur de 5 millions d'euros.",
      "Je suis 2/3 Merkel et 1/3 Thatcher."
    ],
    "mort": [
      "Je suis endettée personnellement à hauteur de 5 millions d'euros."
    ],
    "casserole": [
      "Je suis endettée personnellement à hauteur de 5 millions d'euros."
    ],
    "pose": [
      "Les sondages, ça va et vient, c'est comme la queue du chien !",
      "Perdu dans le métavers ?",
      "Je suis 2/3 Merkel et 1/3 Thatcher."
    ],
    "celebration": [
      "Debout !",
      "Vous m'avez manqué !",
      "Je suis 2/3 Merkel et 1/3 Thatcher."
    ],
    "defaite": [
      "Les sondages, ça va et vient, c'est comme la queue du chien !"
    ],
    "victoire": [
      "Vous m'avez manqué !"
    ]
  },
  "fillon": {
    "heros": [
      "Il ne sert à rien de parler d'autorité quand on n'est pas soi-même irréprochable !",
      "Je suis à la tête d'un État qui est en situation de faillite.",
      "Qui imagine un seul instant le général de Gaulle mis en examen ?"
    ],
    "casserole": [
      "Il ne sert à rien de parler d'autorité quand on n'est pas soi-même irréprochable !",
      "C'est un assassinat politique.",
      "Qui imagine un seul instant le général de Gaulle mis en examen ?"
    ],
    "pose": [
      "Il ne sert à rien de parler d'autorité quand on n'est pas soi-même irréprochable !",
      "Je suis à la tête d'un État qui est en situation de faillite.",
      "Qui imagine un seul instant le général de Gaulle mis en examen ?"
    ],
    "celebration": [
      "Je ne céderai pas, je ne me rendrai pas, je ne me retirerai pas, j'irai jusqu'au bout.",
      "J'espère au moins que la farine était française !"
    ],
    "prison": [
      "Je ne céderai pas, je ne me rendrai pas, je ne me retirerai pas, j'irai jusqu'au bout."
    ],
    "mort": [
      "C'est un assassinat politique.",
      "J'espère au moins que la farine était française !",
      "Je suis à la tête d'un État qui est en situation de faillite."
    ]
  },
  "dati": {
    "heros": [
      "[…] une fellation quasi nulle […]",
      "Je serai quoi qu'il arrive candidate."
    ],
    "pose": [
      "[…] une fellation quasi nulle […]"
    ],
    "celebration": [
      "[…] une fellation quasi nulle […]"
    ],
    "casserole": [
      "Je n'ai rien à cacher."
    ],
    "mort": [
      "Je serai quoi qu'il arrive candidate."
    ]
  },
  "sarkozy": {
    "heros": [
      "Il est temps pour moi d'aborder une vie avec plus de passion privée et moins de passion publique.",
      "Eh ben casse-toi alors, pauv' con !"
    ],
    "celebration": [
      "Vous en avez assez de cette bande de racailles ? Eh bien on va vous en débarrasser.",
      "Le petit ne prend pas de tranche de jambon et prendra une double ration de frites.",
      "C'est toi qui a dit ça ? Ben descends un peu le dire !",
      "Désormais, quand il y a une grève, plus personne ne s'en aperçoit.",
      "C'est ça la République !",
      "Eh ben casse-toi alors, pauv' con !",
      "Dès demain, on va nettoyer au Kärcher la cité.",
      "Dès que vous devenez français, vos ancêtres sont gaulois."
    ],
    "pose": [
      "Vous en avez assez de cette bande de racailles ? Eh bien on va vous en débarrasser.",
      "Le drame de l'Afrique, c'est que l'homme africain n'est pas assez entré dans l'histoire.",
      "Le petit ne prend pas de tranche de jambon et prendra une double ration de frites.",
      "C'est toi qui a dit ça ? Ben descends un peu le dire !",
      "Bonjour, je suis Nicolas Sarkozy et j'ai le grand plaisir de lire Le Temps des tempêtes pour Audible.",
      "Dès demain, on va nettoyer au Kärcher la cité.",
      "Dès que vous devenez français, vos ancêtres sont gaulois.",
      "Un sadique ou un imbécile, choisissez, avait mis dans le programme d'interroger les concurrents sur La Princesse de Clèves."
    ],
    "prison": [
      "S'ils veulent absolument que je dorme en prison, je dormirai en prison, mais la tête haute."
    ],
    "casserole": [
      "S'ils veulent absolument que je dorme en prison, je dormirai en prison, mais la tête haute.",
      "La haine n'a donc décidément aucune limite."
    ],
    "mort": [
      "La haine n'a donc décidément aucune limite.",
      "Il est temps pour moi d'aborder une vie avec plus de passion privée et moins de passion publique.",
      "Quelle indignité !",
      "Eh ben casse-toi alors, pauv' con !"
    ],
    "defaite": [
      "Quelle indignité !"
    ]
  },
  "chirac": {
    "pose": [
      "Si vous ajoutez à cela le bruit et l'odeur, eh bien le travailleur français sur le palier devient fou.",
      "Je décide et il exécute.",
      "Ce soir, je ne suis pas le Premier ministre et vous n'êtes pas le président de la République.",
      "C'est d'abord parce que j'aime beaucoup les pommes, je suis un mangeur de pommes.",
      "Mais la pomme est un fruit sympathique et je l'observe tous les jours.",
      "Si vous ajoutez à cela le bruit et l'odeur…",
      "Notre problème, ce n'est pas les étrangers, c'est qu'il y a overdose.",
      "Qu'est-ce qu'elle veut de plus, cette mégère ? Mes couilles sur un plateau ?"
    ],
    "heros": [
      "Si vous ajoutez à cela le bruit et l'odeur, eh bien le travailleur français sur le palier devient fou.",
      "Je décide et il exécute.",
      "Aujourd'hui, on rapporte une histoire abracadabrantesque."
    ],
    "celebration": [
      "Je décide et il exécute.",
      "What do you want? Me to go back to my plane and go back to France?",
      "C'est d'abord parce que j'aime beaucoup les pommes, je suis un mangeur de pommes.",
      "Qu'est-ce qu'elle veut de plus, cette mégère ? Mes couilles sur un plateau ?",
      "Ce n'est pas qu'elles se dégonflent, c'est qu'elles font pschitt, si vous me permettez cette expression."
    ],
    "casserole": [
      "Si vous ajoutez à cela le bruit et l'odeur…",
      "Ce n'est pas qu'elles se dégonflent, c'est qu'elles font pschitt, si vous me permettez cette expression.",
      "Aujourd'hui, on rapporte une histoire abracadabrantesque."
    ],
    "mort": [
      "What do you want? Me to go back to my plane and go back to France?",
      "Ce soir, je ne suis pas le Premier ministre et vous n'êtes pas le président de la République."
    ]
  },
  "giscard": {
    "heros": [
      "Vous n'avez pas, monsieur Mitterrand, le monopole du cœur. Vous ne l'avez pas.",
      "Je souhaite que la Providence veille sur la France, pour son bonheur, pour son bien et pour sa grandeur. Au revoir."
    ],
    "celebration": [
      "Vous n'avez pas, monsieur Mitterrand, le monopole du cœur. Vous ne l'avez pas."
    ],
    "mort": [
      "Je souhaite que la Providence veille sur la France, pour son bonheur, pour son bien et pour sa grandeur. Au revoir."
    ],
    "casserole": [
      "Il faut laisser les choses basses mourir de leur propre poison."
    ]
  },
  "de_gaulle": {
    "heros": [
      "Je vous ai compris !",
      "Vive Montréal ! Vive le Québec ! Vive le Québec libre !"
    ],
    "pose": [
      "Bien entendu, on peut sauter sur sa chaise comme un cabri en disant « l'Europe ! », « l'Europe ! », « l'Europe ! »…",
      "Je vous ai compris !",
      "La réforme, oui ; la chienlit, non !",
      "Ce pouvoir a une apparence : un quarteron de généraux en retraite.",
      "Pourquoi voulez-vous qu'à 67 ans, je commence une carrière de dictateur ?",
      "La ménagère veut le progrès, mais elle ne veut pas la pagaille !",
      "[…] un peuple d'élite, sûr de lui-même et dominateur."
    ],
    "celebration": [
      "Bien entendu, on peut sauter sur sa chaise comme un cabri en disant « l'Europe ! », « l'Europe ! », « l'Europe ! »…",
      "Vive Montréal ! Vive le Québec ! Vive le Québec libre !",
      "Ce pouvoir a une apparence : un quarteron de généraux en retraite.",
      "La ménagère veut le progrès, mais elle ne veut pas la pagaille !",
      "Dans les circonstances présentes, je ne me retirerai pas.",
      "Paris ! Paris outragé ! Paris brisé ! Paris martyrisé ! Mais Paris libéré !"
    ],
    "casserole": [
      "La réforme, oui ; la chienlit, non !",
      "Pourquoi voulez-vous qu'à 67 ans, je commence une carrière de dictateur ?",
      "Dans les circonstances présentes, je ne me retirerai pas."
    ],
    "mort": [
      "Je ne vais pas mal, mais rassurez-vous, un jour je ne manquerai pas de mourir.",
      "Je cesse d'exercer mes fonctions de président de la République. Cette décision prend effet aujourd'hui à midi."
    ]
  },
  "bardella": {
    "pose": [
      "On se croirait en Arabie saoudite, en Iran, au Qatar.",
      "Le meilleur allié de l'écologie, c'est la frontière."
    ],
    "casserole": [
      "On se croirait en Arabie saoudite, en Iran, au Qatar.",
      "Je ne crois pas que Jean-Marie Le Pen était antisémite.",
      "Ce que fait Mediapart, c'est un feuilleton.",
      "Quelques brebis galeuses.",
      "Des faux grossiers."
    ],
    "celebration": [
      "Bravo Jean Moulin !",
      "Le meilleur allié de l'écologie, c'est la frontière."
    ],
    "heros": [
      "Je ne crois pas que Jean-Marie Le Pen était antisémite."
    ]
  },
  "cheminade": {
    "pose": [
      "Je suis un homme en colère.",
      "[…] l'oligarchie des incapables.",
      "On a tué Ben Laden et Khadafi pour qu'ils ne parlent pas."
    ],
    "heros": [
      "Je suis un homme en colère.",
      "Un monde sans la City ni Wall Street."
    ],
    "casserole": [
      "On a tué Ben Laden et Khadafi pour qu'ils ne parlent pas."
    ],
    "celebration": [
      "[…] l'oligarchie des incapables.",
      "Un monde sans la City ni Wall Street."
    ]
  },
  "durif": {
    "pose": [
      "Consommation de coco.",
      "Ma bite cosmique. Le camarade, il dit : waouh, qu'est-ce que c'est que ce truc ?",
      "Bonjour, je suis Sylvain Durif, alias le Grand Monarque, le Christ cosmique.",
      "J'incarne l'énergie du Christ cosmique."
    ],
    "celebration": [
      "Ma bite cosmique. Le camarade, il dit : waouh, qu'est-ce que c'est que ce truc ?"
    ],
    "heros": [
      "Bonjour, je suis Sylvain Durif, alias le Grand Monarque, le Christ cosmique.",
      "J'incarne l'énergie du Christ cosmique."
    ]
  },
  "hanouna": {
    "victoire": [
      "Chérie, bisous, je l'adore !",
      "Hanouna, il est juif.",
      "Toi, t'es une merde.",
      "Arrête de te la raconter ! Espèce d'abruti. Si t'es député c'est grâce à nous.",
      "Sur la séquence, je m'excuse pas du tout.",
      "On a été premier talk grâce à vous, tous les soirs, on a fait le max."
    ],
    "attente": [
      "Chérie, bisous, je l'adore !",
      "Arrête de regarder le juif.",
      "C'est une pratique, apparemment ça existe et, ça, il a raison de le dire.",
      "Tu sais que tu es dans le groupe Bolloré ici ? Qu'est-ce que tu viens foutre ici alors ?",
      "Sur la séquence, je m'excuse pas du tout."
    ],
    "pose": [
      "Arrête de regarder le juif.",
      "Hanouna, il est juif."
    ],
    "elimination": [
      "Toi, t'es une merde.",
      "Tocard va, allez tais-toi ! Bouffon va !",
      "Mercredi, les chéris, ce sera la dernière de Touche pas à mon poste."
    ],
    "achat": [
      "Arrête de te la raconter ! Espèce d'abruti. Si t'es député c'est grâce à nous.",
      "Tu sais que tu es dans le groupe Bolloré ici ? Qu'est-ce que tu viens foutre ici alors ?"
    ],
    "defaite": [
      "Tocard va, allez tais-toi ! Bouffon va !",
      "C'est une énorme connerie, donc vous êtes cons comme la lune.",
      "Mercredi, les chéris, ce sera la dernière de Touche pas à mon poste.",
      "Toi, t'es une merde.",
      "Sur la séquence, je m'excuse pas du tout."
    ],
    "actualiser": [
      "C'est une pratique, apparemment ça existe et, ça, il a raison de le dire.",
      "C'est une énorme connerie, donc vous êtes cons comme la lune."
    ],
    "echelon": [
      "Arrête de te la raconter ! Espèce d'abruti. Si t'es député c'est grâce à nous."
    ]
  },
  "jmlp": {
    "pose": [
      "Et je vais lui retirer son caleçon.",
      "Ce n'est pas un shampoing, n'est-ce pas, le shampoing Strauss-Kahn.",
      "Je vais te faire courir, moi, tu vas voir, rouquin… Pédé !",
      "Ça ne m'étonne pas. Écoutez, on fera une fournée la prochaine fois.",
      "Socialement je suis de gauche, économiquement je suis de droite, nationalement je suis de France !",
      "Je crois à l'inégalité des races, oui bien sûr, toute l'histoire le démontre.",
      "Chirac, c'est Jospin en pire.",
      "[…] je crois que c'est un point de détail de l'histoire de la Deuxième Guerre mondiale.",
      "M. Durafour-crématoire, merci de cet aveu.",
      "Mgr Ebola peut régler ça en trois mois."
    ],
    "casserole": [
      "Ce n'est pas un shampoing, n'est-ce pas, le shampoing Strauss-Kahn.",
      "Je n'ai pas étudié spécialement la question, mais je crois que c'est un point de détail de l'histoire de la Deuxième Guerre mondiale.",
      "Quand on leur demande d'aller voter en se bouchant le nez, je leur conseille en plus de se mettre une casserole sur la tête.",
      "Jeanne, au secours !",
      "[…] je crois que c'est un point de détail de l'histoire de la Deuxième Guerre mondiale."
    ],
    "heros": [
      "Je vais te faire courir, moi, tu vas voir, rouquin… Pédé !",
      "Je n'ai pas étudié spécialement la question, mais je crois que c'est un point de détail de l'histoire de la Deuxième Guerre mondiale.",
      "Monsieur Durafour-crématoire, merci de cet aveu.",
      "Socialement je suis de gauche, économiquement je suis de droite, nationalement je suis de France !",
      "Il n'est jamais trop tard, mais il est bien trop tard quand même. Monseigneur Ebola peut régler ça en trois mois."
    ],
    "celebration": [
      "Je vais te faire courir, moi, tu vas voir, rouquin… Pédé !",
      "Monsieur Durafour-crématoire, merci de cet aveu.",
      "Ça ne m'étonne pas. Écoutez, on fera une fournée la prochaine fois.",
      "Quand on leur demande d'aller voter en se bouchant le nez, je leur conseille en plus de se mettre une casserole sur la tête.",
      "N'ayez pas peur de rêver, vous les petits, les sans-grade, les exclus.",
      "Socialement je suis de gauche, économiquement je suis de droite, nationalement je suis de France !",
      "Il n'est jamais trop tard, mais il est bien trop tard quand même. Monseigneur Ebola peut régler ça en trois mois.",
      "Je crois à l'inégalité des races, oui bien sûr, toute l'histoire le démontre.",
      "Chirac, c'est Jospin en pire."
    ],
    "mort": [
      "Jeanne, au secours !"
    ],
    "prison": [
      "Jeanne, au secours !"
    ]
  },
  "lepen": {
    "mort": [
      "Vous êtes des enfants de bourgeois ! Des enfants de bourgeois !",
      "Je ne vais pas me laisser éliminer ainsi."
    ],
    "defaite": [
      "Vous êtes des enfants de bourgeois ! Des enfants de bourgeois !"
    ],
    "pose": [
      "Les migrants, c'est comme les éoliennes. Tout le monde est d'accord pour qu'il y en ait, mais personne ne veut que ce soit à côté de chez lui.",
      "Ils sont dans les campagnes, dans les villes, sur les réseaux sociaux.",
      "Monsieur Macron, je vois que vous essayez de jouer avec moi à l'élève et au professeur, ce n'est pas particulièrement mon truc.",
      "De toute façon la France sera dirigée par une femme : ce sera, ou moi, ou Madame Merkel.",
      "Certes il n'y a pas de blindés, il n'y a pas de soldats, mais c'est une occupation tout de même.",
      "Je pense que la France n'est pas responsable du Vél d'Hiv.",
      "Vous avez un talent fou : vous arrivez à parler sept minutes, je suis incapable de résumer votre pensée !",
      "Nicolas Sarkozy, c'est Barbapapa : il peut se transformer en patriote, en centriste […]"
    ],
    "casserole": [
      "Les migrants, c'est comme les éoliennes. Tout le monde est d'accord pour qu'il y en ait, mais personne ne veut que ce soit à côté de chez lui.",
      "Le système a sorti la bombe nucléaire.",
      "Je ne vais pas me laisser éliminer ainsi.",
      "Ah bon, et pourquoi pas le reste ? Pourquoi pas pour favoritisme ? Pourquoi pas pour détournement de fonds publics ?",
      "Je pense que la France n'est pas responsable du Vél d'Hiv.",
      "Ah bon, et pourquoi pas le reste ?"
    ],
    "heros": [
      "Ils sont dans les campagnes, dans les villes, sur les réseaux sociaux.",
      "De toute façon, la France sera dirigée par une femme : ce sera, ou moi, ou Madame Merkel.",
      "Ah bon, et pourquoi pas le reste ? Pourquoi pas pour favoritisme ? Pourquoi pas pour détournement de fonds publics ?",
      "Certes il n'y a pas de blindés, il n'y a pas de soldats, mais c'est une occupation tout de même.",
      "Ah bon, et pourquoi pas le reste ?"
    ],
    "celebration": [
      "Ils sont dans les campagnes, dans les villes, sur les réseaux sociaux.",
      "Monsieur Macron, je vois que vous essayez de jouer avec moi à l'élève et au professeur, ce n'est pas particulièrement mon truc.",
      "De toute façon, la France sera dirigée par une femme : ce sera, ou moi, ou Madame Merkel.",
      "Bouse de vache.",
      "De toute façon la France sera dirigée par une femme : ce sera, ou moi, ou Madame Merkel.",
      "Je suis la candidate du pouvoir d'achat, vous êtes le candidat du pouvoir d'acheter.",
      "Vous avez un talent fou : vous arrivez à parler sept minutes, je suis incapable de résumer votre pensée !",
      "Nicolas Sarkozy, c'est Barbapapa : il peut se transformer en patriote, en centriste […]"
    ],
    "prison": [
      "Le système a sorti la bombe nucléaire.",
      "Je ne vais pas me laisser éliminer ainsi.",
      "Ah bon, et pourquoi pas le reste ? Pourquoi pas pour favoritisme ? Pourquoi pas pour détournement de fonds publics ?",
      "Ah bon, et pourquoi pas le reste ?"
    ]
  },
  "lepers": {
    "victoire": [
      "Ah ouais, ouais, ouais !",
      "Oui, oui, oh ça c'est beau, ça c'est beau.",
      "Oui, oui, oui, oui, oui. Ouais, ouais, ouais.",
      "Oui ! Oui ! Oui !",
      "Mais c'est fou !"
    ],
    "achat": [
      "Ah ouais, ouais, ouais !",
      "Oui, oui, oh ça c'est beau, ça c'est beau.",
      "Oui ! Oui ! Oui !",
      "Mais oui, bien sûr !"
    ],
    "actualiser": [
      "Oui, oui, oui, oui, oui. Ouais, ouais, ouais.",
      "Top !"
    ],
    "triple": [
      "Oui ! Oui ! Oui !",
      "Mais c'est fou !"
    ],
    "echelon": [
      "Mais oui, bien sûr !",
      "Top !"
    ],
    "defaite": [
      "C'est non !",
      "Ça s'est très mal passé, je n'en dis pas plus pour le moment."
    ],
    "elimination": [
      "C'est non !"
    ]
  },
  "macron": {
    "pose": [
      "Sometimes it's too slow, for sure. And it needs to be reformed, for sure.",
      "Oui, peut-être.",
      "For sure.",
      "Nous sommes en guerre.",
      "On peut décider de ripoliner tout seul la façade.",
      "On met un pognon de dingue dans des minima sociaux, les gens ils sont quand même pauvres. On n'en sort pas.",
      "Ce peuple luthérien, qui a vécu les transformations des dernières années, n'est pas exactement le Gaulois réfractaire au changement.",
      "Hôtels, cafés, restaurants, je traverse la rue, je vous en trouve !",
      "Il y a dans cette société une majorité de femmes. Il y en a qui sont, pour beaucoup, illettrées.",
      "Une gare, c'est un lieu où on croise les gens qui réussissent et les gens qui ne sont rien […]",
      "Certains, au lieu de foutre le bordel, feraient mieux d'aller regarder s'ils ne peuvent pas avoir des postes là-bas.",
      "Le kwassa-kwassa pêche peu, il amène du Comorien, c'est différent.",
      "Vous n'allez pas me faire peur avec votre tee-shirt. La meilleure façon de se payer un costard, c'est de travailler !"
    ],
    "celebration": [
      "Vive la République ! Vive la France !",
      "For sure.",
      "Nous sommes en guerre.",
      "Parce que c'est notre projet !",
      "Hey ! Hey ! Hey !",
      "Ce peuple luthérien, qui a vécu les transformations des dernières années, n'est pas exactement le Gaulois réfractaire au changement.",
      "Hôtels, cafés, restaurants, je traverse la rue, je vous en trouve !",
      "Une gare, c'est un lieu où on croise les gens qui réussissent et les gens qui ne sont rien.",
      "Ce que je veux, c'est que vous, partout, vous alliez le faire gagner, parce que c'est notre projet !",
      "Vous êtes contents d'être en France. Parce que si c'était pas la France, vous seriez 10 000 fois plus dans la merde !",
      "Ce que vous proposez, comme d'habitude, c'est de la poudre de perlimpinpin.",
      "S'ils veulent un responsable, il est devant vous, qu'ils viennent le chercher.",
      "Eh bien, là, les non-vaccinés, j'ai très envie de les emmerder. Et donc, on va continuer à le faire, jusqu'au bout.",
      "Vous n'allez pas me faire peur avec votre tee-shirt. La meilleure façon de se payer un costard, c'est de travailler !",
      "Je ne céderai rien, ni aux fainéants, ni aux cyniques, ni aux extrêmes."
    ],
    "defaite": [
      "Oui, peut-être.",
      "Oh merde ! Deuxième fois, putain !",
      "Qui aurait pu prédire ?"
    ],
    "mort": [
      "Oh merde ! Deuxième fois, putain !",
      "Vous êtes contents d'être en France. Parce que si c'était pas la France, vous seriez 10 000 fois plus dans la merde !"
    ],
    "casserole": [
      "Qui aurait pu prédire ?",
      "S'ils veulent un responsable, il est devant vous, qu'ils viennent le chercher.",
      "Hôtels, cafés, restaurants, je traverse la rue, je vous en trouve !"
    ],
    "heros": [
      "Nous sommes en guerre.",
      "Parce que c'est notre projet !",
      "On met un pognon de dingue dans des minima sociaux, les gens ils sont quand même pauvres. On n'en sort pas.",
      "Une gare, c'est un lieu où on croise les gens qui réussissent et les gens qui ne sont rien.",
      "Ce que je veux, c'est que vous, partout, vous alliez le faire gagner, parce que c'est notre projet !"
    ],
    "prison": [
      "S'ils veulent un responsable, il est devant vous, qu'ils viennent le chercher."
    ]
  },
  "zemmour": {
    "pose": [
      "Ben voyons !",
      "Pourquoi on est contrôlé 17 fois ? Mais parce que la plupart des trafiquants sont noirs et arabes, c'est comme ça, c'est un fait.",
      "Corinne, ça vous irait très bien.",
      "Ça rigole plus, là ? Poussez-vous ! Reculez !",
      "Ils n'ont rien à faire ici, ils sont voleurs, ils sont assassins, ils sont violeurs, c'est tout ce qu'ils sont.",
      "J'appartiens à la race blanche, vous appartenez à la race noire.",
      "Si oui, ils méritent leur colonisation ; sinon, ils devront se battre pour leur libération.",
      "Je pense que l'obsession de l'inclusion est une mauvaise manière faite aux autres enfants et à ces enfants-là.",
      "Votre mère a eu tort."
    ],
    "casserole": [
      "Ben voyons !",
      "Ils n'ont rien à faire ici, ils sont voleurs, ils sont assassins, ils sont violeurs, c'est tout ce qu'ils sont.",
      "C'est votre prénom qui est une insulte à la France, parce que la France n'est pas une terre vierge.",
      "C'est encore une fois le réel, je suis désolé."
    ],
    "heros": [
      "Pourquoi on est contrôlé 17 fois ? Mais parce que la plupart des trafiquants sont noirs et arabes, c'est comme ça, c'est un fait.",
      "Pétain a sauvé les Juifs français !",
      "C'est votre prénom qui est une insulte à la France, parce que la France n'est pas une terre vierge.",
      "J'appartiens à la race blanche, vous appartenez à la race noire.",
      "Je ne me tromperai pas d'adversaire."
    ],
    "celebration": [
      "Corinne, ça vous irait très bien.",
      "Ça rigole plus, là ? Poussez-vous ! Reculez !",
      "Et bien profond.",
      "Si oui, ils méritent leur colonisation ; sinon, ils devront se battre pour leur libération."
    ],
    "mort": [
      "Et bien profond.",
      "Je ne me tromperai pas d'adversaire."
    ]
  },
  "boyard": {
    "heros": [
      "Et je vais vous donner l'exemple de Bolloré qui a déforesté le Cameroun."
    ],
    "pose": [
      "Et je vais vous donner l'exemple de Bolloré qui a déforesté le Cameroun.",
      "Bon, le 7 mars, on fait quoi ?",
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
    "pose": [
      "Je dois dire que je suis assez surpris parce que je pensais faire un duplex avec Franceinfo.",
      "Vrai plaisir de faire rager l'extrême droite avec cet hommage tous les ans depuis cinq ans."
    ],
    "casserole": [
      "Vous faites de la désinformation. On est sur le service public de l'information.",
      "Vous faites de la désinformation."
    ],
    "celebration": [
      "Vrai plaisir de faire rager l'extrême droite avec cet hommage tous les ans depuis cinq ans."
    ]
  },
  "delogu": {
    "pose": [
      "Toutes les ordures comme Balkany, Odoul, Hanouna, Jean Messiha, ces pourritures-là.",
      "Ce que fait François Ruffin, c'est absolument pitoyable, il est tombé bien bas."
    ],
    "celebration": [
      "Toutes les ordures comme Balkany, Odoul, Hanouna, Jean Messiha, ces pourritures-là.",
      "On aurait dit qu'elle avait vu le diable."
    ],
    "casserole": [
      "J'étais juste un peu fatigué, j'ai écorché juste un mot."
    ],
    "prison": [
      "On aurait dit qu'elle avait vu le diable."
    ]
  },
  "portes": {
    "pose": [
      "Calmez-vous collègues, il n'y a pas de ballon ici !",
      "Les sportifs israéliens ne sont pas les bienvenus aux Jeux olympiques à Paris.",
      "Ferme ta gueule !",
      "Monsieur le ministre Olivier Dussopt, retirez votre réforme des retraites."
    ],
    "celebration": [
      "Ferme ta gueule !",
      "Monsieur le ministre Olivier Dussopt, retirez votre réforme des retraites.",
      "Je reviens déterminé et combatif, comme je l'étais avant mon exclusion, mon état d'esprit n'a pas changé."
    ],
    "heros": [
      "Calmez-vous collègues, il n'y a pas de ballon ici !"
    ],
    "casserole": [
      "Je retirerai mon tweet, le jour où vous retirerez cette réforme qui va sacrifier des milliers de gens, voilà la réalité !"
    ],
    "prison": [
      "Calmez-vous collègues, il n'y a pas de ballon ici !",
      "Je retirerai mon tweet, le jour où vous retirerez cette réforme qui va sacrifier des milliers de gens, voilà la réalité !",
      "Je reviens déterminé et combatif, comme je l'étais avant mon exclusion, mon état d'esprit n'a pas changé."
    ]
  },
  "trouve": {
    "pose": [
      "Une telle loi criminelle, contre les enfants.",
      "Chaque député va être mis devant ses responsabilités.",
      "Lui-même, quelque part, n'y croit plus vraiment, puisqu'une majorité de Français souhaite son départ."
    ],
    "casserole": [
      "Une telle loi criminelle, contre les enfants."
    ],
    "celebration": [
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
  "guette": {
    "pose": [
      "La famille traditionnelle est survalorisée, le couple hétérosexuel."
    ],
    "casserole": [
      "C'est une forme d'extrême droitisation de la société."
    ]
  },
  "tache": {
    "pose": [
      "On va maintenant regarder combien il y a de personnes sous la couette chez les gens ?"
    ],
    "heros": [
      "On va maintenant regarder combien il y a de personnes sous la couette chez les gens ?"
    ],
    "casserole": [
      "Est-ce que vous me poseriez la question sur une famille catholique, une jeune fille à qui on mettrait un serre-tête ?",
      "La police tue partout."
    ],
    "prison": [
      "La police tue partout."
    ]
  },
  "chikirou": {
    "heros": [
      "Pour me faire baisser les yeux, il faudra me les crever.",
      "Je lui ai fait un sourire kabyle.",
      "On va redécouvrir Sophia Chikirou.",
      "Je n'incarnerai pas le Paris milliardaire, mais le Paris populaire."
    ],
    "celebration": [
      "Je lui ai fait un sourire kabyle."
    ],
    "casserole": [
      "Pour me faire baisser les yeux, il faudra me les crever.",
      "J'ai laissé pendant des années des adversaires politiques et médiatiques salir mon image."
    ],
    "pose": [
      "Je ne parviens pas à ressentir de compassion sincère pour ces journalistes.",
      "On va redécouvrir Sophia Chikirou.",
      "Je lui ai fait un sourire kabyle.",
      "Je n'incarnerai pas le Paris milliardaire, mais le Paris populaire."
    ]
  },
  "bompard": {
    "celebration": [
      "Et je le fais avec un grand sourire monsieur Toussaint."
    ],
    "pose": [
      "Franchement, je ne pensais pas qu'ici, sur France Inter, on aurait les polémiques de la bollorosphère.",
      "Franchement, je ne pensais pas qu'ici, sur France Inter, on aurait les polémiques de la Bollorésphère.",
      "Vous avez écouté la conférence madame ? Regardez au moins une conférence."
    ],
    "casserole": [
      "Franchement, je ne pensais pas qu'ici, sur France Inter, on aurait les polémiques de la bollorosphère.",
      "Franchement, je ne pensais pas qu'ici, sur France Inter, on aurait les polémiques de la Bollorésphère.",
      "Je peux vous le dire dix fois si vous voulez."
    ]
  },
  "coquerel": {
    "casserole": [
      "Cette personne est certainement plus respectable que Bruno Retailleau."
    ],
    "heros": [
      "Cette personne est certainement plus respectable que Bruno Retailleau."
    ]
  },
  "panot": {
    "pose": [
      "Faut-il attendre que Matignon soit infecté, pour qu'enfin, vous réagissiez ?",
      "Ne pas oublier ces crimes, aujourd'hui plus que jamais, avec un président de la République qui rend honneur à Pétain et 89 députés RN."
    ],
    "heros": [
      "Faut-il attendre que Matignon soit infecté, pour qu'enfin, vous réagissiez ?"
    ],
    "casserole": [
      "Il n'y a pas de propos homophobes dans mon groupe !",
      "Je pense que ce serait bien de ne même pas le dire dans cette interview.",
      "Bien sûr que non Emmanuel Macron n'est pas Philippe Pétain."
    ],
    "mort": [
      "Je pense que ce serait bien de ne même pas le dire dans cette interview."
    ]
  },
  "ruffin": {
    "heros": [
      "Vous êtes haï, vous êtes haï, vous êtes haï."
    ],
    "celebration": [
      "Vous êtes haï, vous êtes haï, vous êtes haï.",
      "Avec Jean-Luc à la télé tous les deux jours, ça nous étranglait.",
      "On a regagné des voix par centaines."
    ],
    "pose": [
      "Le football, c'est le bonheur de l'enfance.",
      "Avec Jean-Luc à la télé tous les deux jours, ça nous étranglait.",
      "Vous êtes haï, vous êtes haï, vous êtes haï."
    ],
    "casserole": [
      "Avec Jean-Luc à la télé tous les deux jours, ça nous étranglait."
    ]
  },
  "aubry": {
    "pose": [
      "Jordan Bardella n'est pas du parti à la flamme mais à la flemme nationale.",
      "Jordan Bardella est le larbin des grands patrons.",
      "Je sais que je suis chez CNews."
    ],
    "heros": [
      "Jordan Bardella n'est pas du parti à la flamme mais à la flemme nationale."
    ],
    "celebration": [
      "Pardon, mais pour des gens qui prétendent défendre la valeur travail, c'est lui qui est un assisté et un profiteur."
    ]
  },
  "melenchon": {
    "heros": [
      "La République, c'est moi ! C'est moi qui suis parlementaire !",
      "Qu'esseuh-que ça veut direuh ? Quelqu'un a une question formulée en français et à peu près compréhensible ?",
      "Faites mieux !"
    ],
    "casserole": [
      "La République, c'est moi ! C'est moi qui suis parlementaire !",
      "Personne ne me touche ! Ma personne est sacrée ! Je suis parlementaire !",
      "Vous verrez que dans la dernière semaine de la campagne présidentielle, nous aurons un grave incident ou un meurtre.",
      "La République, c'est moi ! C'est moi qui suis parlementaire.",
      "Tu fermes ta petite bouche, tu me parles de politique.",
      "Un comportement de quelqu'un qui ne pense plus en français, qui pense dans la langue de la finance internationale.",
      "Je réponds si je veux, et comme je le veux."
    ],
    "prison": [
      "Personne ne me touche ! Ma personne est sacrée ! Je suis parlementaire !"
    ],
    "pose": [
      "Qu'esseuh-que ça veut direuh ? Quelqu'un a une question formulée en français et à peu près compréhensible ?",
      "Vous verrez que dans la dernière semaine de la campagne présidentielle, nous aurons un grave incident ou un meurtre.",
      "Je ne peux pas vivre quand il n'y a que des blonds aux yeux bleus, c'est au-delà de mes forces.",
      "La République, c'est moi ! C'est moi qui suis parlementaire.",
      "Tu fermes ta petite bouche, tu me parles de politique.",
      "Il est venu le temps des hologrammes.",
      "Qu'esseuh-que ça veut direuh ?",
      "Je réponds si je veux, et comme je le veux.",
      "Je ne sais pas si Jésus était sur la croix. Je sais qui l'y a mis, paraît-il, ce sont ses propres compatriotes."
    ],
    "celebration": [
      "Eh bien, qu'ils aillent se faire foutre ! Les Lituaniens ? Tu en connais un, toi, de Lituanien ?",
      "La République, c'est moi ! C'est moi qui suis parlementaire.",
      "Tu fermes ta petite bouche, tu me parles de politique."
    ],
    "mort": [
      "Vous êtes des gens sans principe, sans foi ni loi. Allez, bonsoir tout le monde.",
      "Faites mieux !"
    ]
  },
  "roussel": {
    "heros": [
      "Franchement, vous n'allez pas me parler du sexe des escalopes quand même !"
    ],
    "pose": [
      "Franchement, vous n'allez pas me parler du sexe des escalopes quand même !",
      "La gauche doit défendre le travail et le salaire, et ne pas être la gauche des allocations, minima sociaux et revenus de substitution.",
      "La station d'essence est le seul endroit en France où celui qui tient le pistolet est aussi celui qui se fait braquer.",
      "Un bon vin, un bon fromage, une bonne viande, pour moi c'est la bonne gastronomie française."
    ],
    "celebration": [
      "On mange de la viande en fonction de ce que l'on a dans le porte-monnaie, pas en fonction de ce qu'on a dans sa culotte…",
      "Franchement, vous n'allez pas me parler du sexe des escalopes quand même !",
      "On mange de la viande en fonction de ce que l'on a dans le porte-monnaie, pas en fonction de ce qu'on a dans sa culotte ou dans son slip.",
      "La station d'essence est le seul endroit en France où celui qui tient le pistolet est aussi celui qui se fait braquer.",
      "Un bon vin, un bon fromage, une bonne viande, pour moi c'est la bonne gastronomie française."
    ],
    "casserole": [
      "La gauche doit défendre le travail et le salaire, et ne pas être la gauche des allocations, minima sociaux et revenus de substitution."
    ]
  },
  "poutou": {
    "heros": [
      "Nous, quand on est convoqué par la police, nous ouvriers, nous n'avons pas d'immunité ouvrière, désolé, on y va !",
      "Vous parlez du fasciste raciste, qui est accusé d'agressions sexuelles ?"
    ],
    "celebration": [
      "Nous, quand on est convoqué par la police, nous ouvriers, nous n'avons pas d'immunité ouvrière, désolé, on y va !",
      "François Fillon, que des histoires, plus on fouille plus on sent la corruption, la triche.",
      "Pour quelqu'un d'anti-européen, ça ne la gêne pas de piquer dans les caisses de l'Europe.",
      "La richesse, c'est le vol."
    ],
    "pose": [
      "François Fillon, que des histoires, plus on fouille plus on sent la corruption, la triche.",
      "Vous parlez du fasciste raciste, qui est accusé d'agressions sexuelles ?"
    ],
    "prison": [
      "Nous, quand on est convoqué par la police, nous ouvriers, nous n'avons pas d'immunité ouvrière, désolé, on y va !"
    ],
    "casserole": [
      "Nous, quand on est convoqué par la police, nous ouvriers, nous n'avons pas d'immunité ouvrière, désolé, on y va !"
    ]
  },
  "kazib": {
    "pose": [
      "C'est inadmissible ce que tu racontes Olivier !",
      "Une candidature ouvrière, communiste et révolutionnaire à la présidentielle."
    ],
    "heros": [
      "C'est inadmissible ce que tu racontes Olivier !",
      "Une candidature ouvrière, communiste et révolutionnaire à la présidentielle."
    ],
    "mort": [
      "Je vous laisse madame Mehal ! Allez, allez ! Vous ne pouvez pas dire que c'est du terrorisme !"
    ],
    "celebration": [
      "C'est inadmissible ce que tu racontes Olivier !"
    ]
  },
  "ndiaye": {
    "heros": [
      "Moi, je ne sais pas utiliser un masque.",
      "J'assume parfaitement de mentir pour protéger le président."
    ],
    "pose": [
      "Moi, je ne sais pas utiliser un masque.",
      "Nous n'entendons pas demander à un enseignant qui aujourd'hui ne travaille pas de traverser toute la France pour aller récolter des fraises.",
      "C'est pas du travail de journaliste, c'est du travail de sagouin !",
      "Aucune idée, la meuf est morte il y a moins de vingt-quatre heures.",
      "Nous avons conscience que nos concitoyens ne mangent pas du homard tous les jours. Bien souvent c'est plutôt des kebabs."
    ],
    "celebration": [
      "Nous n'entendons pas demander à un enseignant qui aujourd'hui ne travaille pas de traverser toute la France pour aller récolter des fraises.",
      "C'est pas du travail de journaliste, c'est du travail de sagouin !",
      "Nous avons conscience que nos concitoyens ne mangent pas du homard tous les jours. Bien souvent c'est plutôt des kebabs.",
      "Si vous n'êtes pas contente, je vous sors du pool."
    ],
    "casserole": [
      "J'assume parfaitement de mentir pour protéger le président."
    ]
  },
  "maillard": {
    "heros": [
      "L'immense majorité, c'est leur choix, oui."
    ],
    "pose": [
      "L'immense majorité, c'est leur choix, oui.",
      "Je suis dans la vie réelle, tout simplement."
    ],
    "casserole": [
      "Nous le chiffre que l'on a, c'est 50 SDF par jour dorment malgré eux dehors dans le froid.",
      "Je redis que mes propos étaient maladroits mais j'aurais aimé qu'on les prenne dans leur intégralité."
    ],
    "celebration": [
      "Je suis dans la vie réelle, tout simplement.",
      "L'essentiel, c'est la dynamique."
    ],
    "mort": [
      "Je redis que mes propos étaient maladroits mais j'aurais aimé qu'on les prenne dans leur intégralité.",
      "L'essentiel, c'est la dynamique."
    ]
  },
  "rugy": {
    "casserole": [
      "C'est n'importe quoi ! Qu'ils me le montrent, ce sèche-cheveux !",
      "Je n'ai pas de raison de démissionner.",
      "J'en ai plus que marre de voir qu'on essaye de me tailler un portrait de Monsieur DE Rugy, et de sa femme, qui vivent la vie de château.",
      "Je suis victime d'une tricherie du propriétaire et de l'agence immobilière."
    ],
    "celebration": [
      "C'est n'importe quoi ! Qu'ils me le montrent, ce sèche-cheveux !"
    ],
    "heros": [
      "J'ai une intolérance aux crustacés."
    ],
    "pose": [
      "J'ai une intolérance aux crustacés.",
      "On essaye de me tailler un portrait de Monsieur DE Rugy, et de sa femme, qui vivent la vie de château.",
      "J'en ai plus que marre de voir qu'on essaye de me tailler un portrait de Monsieur DE Rugy, et de sa femme, qui vivent la vie de château."
    ],
    "mort": [
      "Je n'ai pas de raison de démissionner.",
      "C'est le fantasme du coupage de têtes !"
    ],
    "prison": [
      "C'est le fantasme du coupage de têtes !"
    ]
  },
  "schiappa": {
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
      "Défendre le droit des femmes à disposer de leurs corps, c'est partout et tout le temps. En France, les femmes sont libres.",
      "Rentrer dans le moule, c'est l'ambition d'une tarte.",
      "Nous sommes la République, pas les Village People.",
      "On ne va pas interdire les plans à trois, l'infidélité, le polyamour, les trouples […]"
    ],
    "celebration": [
      "Défendre le droit des femmes à disposer de leurs corps, c'est partout et tout le temps. En France, les femmes sont libres.",
      "Tu n'es qu'un sac à main de seconde main.",
      "On ne va pas interdire les plans à trois, l'infidélité, le polyamour, les trouples […]"
    ],
    "heros": [
      "Rentrer dans le moule, c'est l'ambition d'une tarte."
    ]
  },
  "castaner": {
    "heros": [
      "Ici, à la Pitié-Salpêtrière, on a attaqué un hôpital. On a agressé son personnel soignant."
    ],
    "casserole": [
      "Moi, je ne connais aucun policier, aucun gendarme, qui ait attaqué des gilets jaunes.",
      "Ici, à la Pitié-Salpêtrière, on a attaqué un hôpital. On a agressé son personnel soignant.",
      "On a attaqué un hôpital."
    ],
    "pose": [
      "Moi, je ne connais aucun policier, aucun gendarme, qui ait attaqué des gilets jaunes.",
      "C'était mon grand frère, mon protecteur. Il m'appelait l'étudiant.",
      "On a attaqué un hôpital."
    ],
    "prison": [
      "C'était mon grand frère, mon protecteur. Il m'appelait l'étudiant."
    ]
  },
  "berge": {
    "casserole": [
      "Quand vous êtes ministre, votre travail, c'est de discuter avec celles et ceux qui ont un avis, une position.",
      "C'est surtout une copine :) Elle sera très aidante avec moi."
    ],
    "pose": [
      "Quand vous êtes ministre, votre travail, c'est de discuter avec celles et ceux qui ont un avis, une position."
    ],
    "celebration": [
      "C'est surtout une copine :) Elle sera très aidante avec moi."
    ]
  },
  "dupond_moretti": {
    "heros": [
      "Il n'y a pas eu un bras d'honneur, il y en a eu deux, mais à chaque fois accompagnés par des paroles.",
      "Personne n'aurait jamais l'idée sotte, totalement saugrenue, incongrue, invraisemblable de me proposer cela."
    ],
    "celebration": [
      "Il n'y a pas eu un bras d'honneur, il y en a eu deux, mais à chaque fois accompagnés par des paroles.",
      "Je constate que parmi les journalistes femmes qui m'ont interrogé, personne n'était devant moi les seins nus.",
      "Si vous l'avez pris pour vous, je regrette ce geste. Mais lorsque je fais ce double geste, je l'ai dit, c'est un bras d'honneur à la présomption d'innocence."
    ],
    "casserole": [
      "Et la présomption d'innocence, monsieur le député, qu'est-ce que vous en faites ?",
      "Si vous l'avez pris pour vous, je regrette ce geste. Mais lorsque je fais ce double geste, je l'ai dit, c'est un bras d'honneur à la présomption d'innocence.",
      "On est chez les dingues."
    ],
    "pose": [
      "Personne n'aurait jamais l'idée sotte, totalement saugrenue, incongrue, invraisemblable de me proposer cela.",
      "On est chez les dingues."
    ],
    "mort": [
      "Je suis mort de trouille."
    ]
  },
  "lemaire": {
    "heros": [
      "Nous allons provoquer l'effondrement de l'économie russe.",
      "Emmanuel Macron, c'est toujours une idéologie qui a planté la France.",
      "Mon intelligence est un obstacle."
    ],
    "celebration": [
      "Nous allons provoquer l'effondrement de l'économie russe."
    ],
    "pose": [
      "Nous allons provoquer l'effondrement de l'économie russe.",
      "Ils n'ont aucune envie de voir que des personnes peuvent bénéficier d'aides, les renvoyer au Maghreb ou ailleurs, alors qu'ils n'y ont pas droit.",
      "Mon intelligence est un obstacle."
    ],
    "mort": [
      "Emmanuel Macron, c'est toujours une idéologie qui a planté la France."
    ]
  },
  "darmanin": {
    "celebration": [
      "Non mais ne vous vexez pas, calmez-vous madame, ça va bien se passer. Ça va bien se passer. Ça va bien se passer.",
      "Madame Le Pen, dans sa stratégie de dédiabolisation, en vient quasiment à être dans la mollesse je trouve... Il vous faut prendre des vitamines.",
      "[…] en vient quasiment à être dans la mollesse je trouve... Il vous faut prendre des vitamines, je ne vous trouve pas assez dure là."
    ],
    "pose": [
      "Non mais ne vous vexez pas, calmez-vous madame, ça va bien se passer. Ça va bien se passer. Ça va bien se passer.",
      "Quand j'entends le mot « violences policières », moi, personnellement, je m'étouffe.",
      "Ça m'a toujours choqué de rentrer dans un hypermarché et de voir qu'il y avait un rayon de telle cuisine communautaire.",
      "Ce que c'est de vivre avec 950 euros par mois quand les additions dans les restaurants parisiens tournent autour de 200 euros.",
      "Si je suis Maire de Tourcoing, je ne célébrerai pas personnellement de mariages entre 2 hommes et 2 femmes."
    ],
    "heros": [
      "Quand j'entends le mot « violences policières », moi, personnellement, je m'étouffe.",
      "M. Macron n'aura pas de majorité, ou alors de circonstances, et cela durera ce que durent les amours de vacances."
    ],
    "casserole": [
      "Je ne connais pas les subventions données par l'État, mais ça mérite d'être regardé dans le cadre des actions qu'ils ont pu mener.",
      "Ce que c'est de vivre avec 950 euros par mois quand les additions dans les restaurants parisiens tournent autour de 200 euros.",
      "Si je suis Maire de Tourcoing, je ne célébrerai pas personnellement de mariages entre 2 hommes et 2 femmes.",
      "30 000 à 40 000 supporters anglais, soit sans billet, soit avec des billets falsifiés."
    ],
    "prison": [
      "J'irai le voir en prison."
    ],
    "mort": [
      "Quand j'entends le mot « violences policières », moi, personnellement, je m'étouffe.",
      "M. Macron n'aura pas de majorité, ou alors de circonstances, et cela durera ce que durent les amours de vacances."
    ]
  },
  "philippe": {
    "celebration": [
      "C'est le président de la République qui a tué la majorité présidentielle.",
      "On ne va pas faire durer ce que nous vivons depuis six mois pendant 18 mois encore, c'est beaucoup trop long."
    ],
    "pose": [
      "C'est le président de la République qui a tué la majorité présidentielle.",
      "Non, seulement les emmerdes.",
      "Je serai candidat à la prochaine élection présidentielle."
    ],
    "mort": [
      "On ne va pas faire durer ce que nous vivons depuis six mois pendant 18 mois encore, c'est beaucoup trop long."
    ],
    "casserole": [
      "Non, seulement les emmerdes.",
      "Je ne suis pas certain de comprendre la question. Vous voulez connaître mon taux horaire au jour de l'élection ? Ma rémunération mensuelle moyenne ? Annuelle ?"
    ],
    "heros": [
      "Je serai candidat à la prochaine élection présidentielle."
    ]
  },
  "lecornu": {
    "mort": [
      "On ne peut pas être Premier ministre lorsque les conditions ne sont pas remplies.",
      "Ce soir, je considère que ma mission est terminée."
    ],
    "heros": [
      "On ne peut pas être Premier ministre lorsque les conditions ne sont pas remplies.",
      "Je ne cours pas après le job."
    ],
    "celebration": [
      "Je ne cours pas après le job.",
      "J'ai décidé de retirer la suppression de deux jours fériés."
    ]
  },
  "bayrou": {
    "casserole": [
      "J'affirme que je n'ai évidemment jamais, au grand jamais, été informé de quoi que ce soit en matière de violences, a fortiori de violences sexuelles.",
      "Je peux vous assurer que tout est faux. Une plainte en diffamation sera évidemment déposée.",
      "Tu ne me fais pas les poches."
    ],
    "prison": [
      "Je peux vous assurer que tout est faux. Une plainte en diffamation sera évidemment déposée."
    ],
    "pose": [
      "Combien y a-t-il d'étoiles dans le système solaire ? Il y en a, si je ne me trompe pas, entre 200 et 400 milliards."
    ],
    "mort": [
      "Combien y a-t-il d'étoiles dans le système solaire ? Il y en a, si je ne me trompe pas, entre 200 et 400 milliards.",
      "Mesdames et Messieurs les députés, vous avez le pouvoir de renverser le gouvernement, mais vous n'avez pas le pouvoir d'effacer le réel."
    ],
    "celebration": [
      "Tu ne me fais pas les poches."
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
      "Je suis né en 1989, l'année du bicentenaire de la Révolution.",
      "France rime avec puissance."
    ],
    "heros": [
      "Alors oui, j'assume de le dire : il faut désmicardiser la France.",
      "Je suis né en 1989, l'année du bicentenaire de la Révolution."
    ]
  },
  "praud": {
    "achat": [
      "Il y a beaucoup d'immigration en ce moment. Est-ce que c'est les personnes qui n'ont pas les mêmes conditions d'hygiène […] ?",
      "Beaucoup de femmes n'ont pas eu la chance d'être regardées par les hommes et nourrissent parfois un sentiment de revanche.",
      "Si tu pouvais ne pas défendre les Palestiniens à l'antenne, ce serait bien. Ils veulent tuer Israël, les Palestiniens.",
      "C'est moi le chef ! C'est moi le chef ! On parle d'Emmanuel Macron."
    ],
    "actualiser": [
      "Il y a beaucoup d'immigration en ce moment. Est-ce que c'est les personnes qui n'ont pas les mêmes conditions d'hygiène […] ?",
      "Mais enfin, ça va pas ?!"
    ],
    "defaite": [
      "Mais Caroline Mécary, c'est insupportable votre attitude ! […] Il ne faut plus venir.",
      "Mais enfin, ça va pas ?!",
      "Il y a une maladresse de ma part sur le mot immigration, je voulais dire les migrants."
    ],
    "attente": [
      "Beaucoup de femmes n'ont pas eu la chance d'être regardées par les hommes et nourrissent parfois un sentiment de revanche.",
      "Si tu pouvais ne pas défendre les Palestiniens à l'antenne, ce serait bien. Ils veulent tuer Israël, les Palestiniens.",
      "Il y a beaucoup d'immigration en ce moment. Est-ce que c'est les personnes qui n'ont pas les mêmes conditions d'hygiène […] ?",
      "Il y a une maladresse de ma part sur le mot immigration, je voulais dire les migrants."
    ],
    "echelon": [
      "C'est moi le chef ! C'est moi le chef ! On parle d'Emmanuel Macron."
    ],
    "triple": [
      "C'est moi le chef ! C'est moi le chef ! On parle d'Emmanuel Macron."
    ],
    "elimination": [
      "Mais Caroline Mécary, c'est insupportable votre attitude ! […] Il ne faut plus venir."
    ]
  },
  "braun_pivet": {
    "echelon": [
      "Monsieur Delogu, je prononce un rappel à l'ordre avec inscription au procès-verbal."
    ],
    "actualiser": [
      "Monsieur Delogu, je prononce un rappel à l'ordre avec inscription au procès-verbal.",
      "Mes chers collègues, la séance est reprise. Laissez-moi m'exprimer !",
      "J'entends que certains groupes souhaiteraient que le bureau soit convoqué immédiatement. Par conséquent, il va l'être !",
      "Je vous remercie de respecter ma présidence.",
      "Mes chers collègues, s'il vous plaît !"
    ],
    "defaite": [
      "Je saisirai le bureau. C'est inadmissible ! La séance est suspendue."
    ],
    "attente": [
      "Je saisirai le bureau. C'est inadmissible ! La séance est suspendue.",
      "Mes chers collègues, la séance est reprise. Laissez-moi m'exprimer !",
      "Je vous remercie de respecter ma présidence.",
      "Mes chers collègues, s'il vous plaît !"
    ],
    "achat": [
      "J'entends que certains groupes souhaiteraient que le bureau soit convoqué immédiatement. Par conséquent, il va l'être !"
    ],
    "elimination": [
      "Monsieur Delogu, il vous est demandé de quitter l'enceinte de l'Assemblée nationale immédiatement."
    ],
    "victoire": [
      "Monsieur Delogu, il vous est demandé de quitter l'enceinte de l'Assemblée nationale immédiatement."
    ]
  },
  "larcher": {
    "elimination": [
      "Oui, ferme ta gueule."
    ],
    "victoire": [
      "Oui, ferme ta gueule."
    ],
    "actualiser": [
      "Oui, ferme ta gueule."
    ],
    "casserole": [
      "L'IVG n'est pas menacée dans notre pays."
    ],
    "defaite": [
      "L'IVG n'est pas menacée dans notre pays."
    ]
  },
  "pujadas": {
    "triple": [
      "Wouah, c'est génial !"
    ],
    "victoire": [
      "Wouah, c'est génial !"
    ],
    "actualiser": [
      "Est-ce que vous regrettez ces violences ?"
    ],
    "attente": [
      "Est-ce que vous regrettez ces violences ?"
    ],
    "achat": [
      "Pour vous la fin justifie les moyens ?"
    ],
    "echelon": [
      "Pour vous la fin justifie les moyens ?"
    ]
  },
  "fogiel": {
    "defaite": [
      "Donc, j'ai perdu et Gérard Holtz a gagné.",
      "BFM TV n'est pas une chaîne artisanale mais une rédaction qui compte 250 journalistes dont une vingtaine se consacrent à la vérification des informations.",
      "Au risque de vous décevoir, je ne pourrai malheureusement rien vous apprendre.",
      "Je ne suis pas dans une logique de bâillonnement de la presse."
    ],
    "elimination": [
      "Donc, j'ai perdu et Gérard Holtz a gagné."
    ],
    "attente": [
      "BFM TV n'est pas une chaîne artisanale mais une rédaction qui compte 250 journalistes dont une vingtaine se consacrent à la vérification des informations.",
      "Au risque de vous décevoir, je ne pourrai malheureusement rien vous apprendre.",
      "Je ne suis pas dans une logique de bâillonnement de la presse."
    ],
    "victoire": [
      "Il n'y a donc pas de raison de renforcer un dispositif déjà suffisamment robuste."
    ],
    "actualiser": [
      "Il n'y a donc pas de raison de renforcer un dispositif déjà suffisamment robuste."
    ]
  },
  "salame": {
    "attente": [
      "Je voulais juste savoir comment vous alliez, si vous alliez bien, Marion Cotillard, c'est tout.",
      "Je ne suis pas show-biz. Je travaille comme une folle.",
      "Personne ne me tient le crayon, je ne suis pas une femme sous influence."
    ],
    "achat": [
      "Je voulais juste savoir comment vous alliez, si vous alliez bien, Marion Cotillard, c'est tout.",
      "Je ne suis pas avec Jordan Bardella, avec qui vous avez décidément décidé de me marier !"
    ],
    "victoire": [
      "Je ne suis pas show-biz. Je travaille comme une folle.",
      "Je ne suis pas avec Jordan Bardella, avec qui vous avez décidément décidé de me marier !"
    ],
    "pose": [
      "Personne ne me tient le crayon, je ne suis pas une femme sous influence."
    ]
  },
  "lapix": {
    "actualiser": [
      "Merci, sans transition, la réouverture de Notre-Dame, pardon."
    ],
    "triple": [
      "Merci, sans transition, la réouverture de Notre-Dame, pardon."
    ],
    "elimination": [
      "Voilà, c'est fini."
    ],
    "defaite": [
      "Voilà, c'est fini.",
      "Tout passe dans la bouche d'Adriana Karembeu."
    ],
    "attente": [
      "Tout passe dans la bouche d'Adriana Karembeu."
    ]
  },
  "barthes": {
    "actualiser": [
      "Oh la la ! Mais ta gueule ! Qu'est-ce qu'il a encore ?!",
      "La valeur de ces cadeaux avoisinait les 5 euros. Il s'agissait de produits, en l'occurrence de shampooings."
    ],
    "elimination": [
      "Oh la la ! Mais ta gueule ! Qu'est-ce qu'il a encore ?!",
      "Tout le monde s'en fout."
    ],
    "victoire": [
      "Non, non, Mélenchon fait des doigts aux journalistes.",
      "Pourquoi tenez-vous absolument à être invités dans une émission qui ne vous plaît pas ?"
    ],
    "triple": [
      "Non, non, Mélenchon fait des doigts aux journalistes."
    ],
    "defaite": [
      "Tout le monde s'en fout.",
      "Sincèrement, je ne vois pas de quoi vous parlez."
    ],
    "attente": [
      "Tout le monde s'en fout.",
      "Sincèrement, je ne vois pas de quoi vous parlez."
    ],
    "achat": [
      "Pourquoi tenez-vous absolument à être invités dans une émission qui ne vous plaît pas ?",
      "La valeur de ces cadeaux avoisinait les 5 euros. Il s'agissait de produits, en l'occurrence de shampooings."
    ]
  },
  "duhamel": {
    "achat": [
      "On connaissait au Rassemblement national la politique de père en fille. À Reconquête, la politique se fait en couple ?"
    ],
    "actualiser": [
      "La question est sans aucune polémique, Sarah Knafo.",
      "On connaissait au Rassemblement national la politique de père en fille. À Reconquête, la politique se fait en couple ?"
    ],
    "defaite": [
      "Excusez-moi, vous mettez en cause ma probité !",
      "Jusqu'à preuve du contraire, ce n'est pas, ni ma mère, mon père ou mon oncle, qui m'a permis de faire le métier que je fais.",
      "[…] jusqu'à preuve du contraire, ce n'est pas, ni ma mère, mon père ou mon oncle, qui m'a permis de faire le métier que je fais."
    ],
    "casserole": [
      "Excusez-moi, vous mettez en cause ma probité !"
    ],
    "echelon": [
      "Jusqu'à preuve du contraire, ce n'est pas, ni ma mère, mon père ou mon oncle, qui m'a permis de faire le métier que je fais.",
      "[…] jusqu'à preuve du contraire, ce n'est pas, ni ma mère, mon père ou mon oncle, qui m'a permis de faire le métier que je fais."
    ],
    "attente": [
      "La question est sans aucune polémique, Sarah Knafo.",
      "On connaissait au Rassemblement national la politique de père en fille. À Reconquête, la politique se fait en couple ?"
    ]
  },
  "ppda": {
    "achat": [
      "Presque même un peu excité comme un petit garçon qui est en train de rentrer dans la cour des grands.",
      "Une des équipes de TF1 l'a interrogé hier à Cuba."
    ],
    "echelon": [
      "Presque même un peu excité comme un petit garçon qui est en train de rentrer dans la cour des grands."
    ],
    "actualiser": [
      "Une des équipes de TF1 l'a interrogé hier à Cuba."
    ],
    "casserole": [
      "Mais je n'allais pas lui réinventer une vie !"
    ],
    "defaite": [
      "Mais je n'allais pas lui réinventer une vie !"
    ]
  },
  "bouleau": {
    "actualiser": [
      "Les mesures annoncées ce soir concernent notamment le renforcement des contrôles de pass sanitaire et le port du voile… le port du masque, pardonnez-moi."
    ],
    "defaite": [
      "Les mesures annoncées ce soir concernent notamment le renforcement des contrôles de pass sanitaire et le port du voile… le port du masque, pardonnez-moi."
    ]
  },
  "vallaud": {
    "celebration": [
      "Cette motion de censure, c'est d'abord votre échec.",
      "Cette suspension est une victoire et permet d'envisager le blocage et l'abrogation."
    ],
    "pose": [
      "J'en ai marre que les PME paient les impôts des multinationales !",
      "Cette motion de censure, c'est d'abord votre échec.",
      "Rien de nouveau ne paraît pouvoir se construire à l'ombre de celui qui veut que rien ne pousse.",
      "Les gens ne sont pas contre payer des impôts, ils veulent que tout le monde les paye.",
      "De peur de trop en dire, Michel Barnier n'a pas dit grand chose."
    ],
    "mort": [
      "Je le dis peiné : la Nupes, ça ne marche pas, ça marche mal !",
      "De peur de trop en dire, Michel Barnier n'a pas dit grand chose."
    ]
  },
  "mitterrand": {
    "heros": [
      "C'est quand même ennuyeux que, dans l'intervalle, vous soyez devenu, vous, l'homme du passif.",
      "Mais vous avez tout à fait raison, monsieur le Premier ministre.",
      "Je crois aux forces de l'esprit et je ne vous quitterai pas."
    ],
    "celebration": [
      "C'est quand même ennuyeux que, dans l'intervalle, vous soyez devenu, vous, l'homme du passif.",
      "Mais vous avez tout à fait raison, monsieur le Premier ministre.",
      "[…] dans l'intervalle vous soyez devenu, vous, l'homme du passif […]"
    ],
    "pose": [
      "Je ne suis pas votre élève.",
      "Mais vous avez tout à fait raison, monsieur le Premier ministre."
    ],
    "casserole": [
      "Je ne suis pas votre élève.",
      "Dans les yeux, je la conteste."
    ],
    "mort": [
      "Je crois aux forces de l'esprit et je ne vous quitterai pas."
    ]
  },
  "doucet": {
    "heros": [
      "Le Tour de France continue à véhiculer une image machiste du sport."
    ],
    "pose": [
      "Le Tour de France continue à véhiculer une image machiste du sport.",
      "Combien de véhicules à moteur thermique circulent pour faire courir ces coureurs à vélo ?"
    ],
    "celebration": [
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
    "pose": [
      "Madame Braun-Pivet, c'est Alain Delon quoi : paroles, paroles, paroles.",
      "Humaniste en carton-pâte, vous avez offert une victoire idéologique à Le Pen !",
      "Le Medef est aujourd'hui l'ennemi public numéro 1 de la cohésion sociale. C'est une organisation séparatiste."
    ],
    "celebration": [
      "Sanctionnez-nous tant que vous voulez !",
      "Madame Braun-Pivet, c'est Alain Delon quoi : paroles, paroles, paroles.",
      "Humaniste en carton-pâte, vous avez offert une victoire idéologique à Le Pen !",
      "Quel discours ringard : Il a 90 ans !",
      "Le Medef est aujourd'hui l'ennemi public numéro 1 de la cohésion sociale. C'est une organisation séparatiste."
    ],
    "prison": [
      "Sanctionnez-nous tant que vous voulez !"
    ],
    "casserole": [
      "Sanctionnez-nous tant que vous voulez !"
    ]
  },
  "batho": {
    "casserole": [
      "J'ai été limogée par SMS, sur Twitter, en direct. C'est très moderne.",
      "C'est un mauvais budget."
    ],
    "mort": [
      "C'est un mauvais budget."
    ]
  },
  "hurmic": {
    "heros": [
      "Nous ne mettrons pas des arbres morts sur les places de la ville, notamment sur la place Pey-Berland.",
      "J'ai des collègues qui sont des shérifs, qui rêvent d'être le premier flic sur leur commune […] moi je ne suis pas un maire shérif."
    ],
    "pose": [
      "Nous ne mettrons pas des arbres morts sur les places de la ville, notamment sur la place Pey-Berland.",
      "J'ai des collègues qui sont des shérifs, qui rêvent d'être le premier flic sur leur commune […] moi je ne suis pas un maire shérif."
    ],
    "celebration": [
      "C'est pas du tout notre conception de la végétalisation.",
      "Nous ne mettrons pas des arbres morts sur les places de la ville, notamment sur la place Pey-Berland."
    ],
    "mort": [
      "C'est pas du tout notre conception de la végétalisation."
    ],
    "casserole": [
      "J'étais peut-être un maire manifestant, mais j'étais aussi le maire des commerçants, en même temps."
    ]
  },
  "mamere": {
    "pose": [
      "Manuel Valls, ce n'est pas la gauche.",
      "L'état d'urgence, il n'a permis d'arrêter que 6 terroristes et ce n'était même pas des terroristes."
    ],
    "defaite": [
      "L'état d'urgence, il n'a permis d'arrêter que 6 terroristes et ce n'était même pas des terroristes."
    ],
    "mort": [
      "Notre parti ne produit plus rien : il est prisonnier de ses calculs et de ses clans.",
      "Nous sommes devenus un syndicat d'élus."
    ],
    "heros": [
      "Nous sommes devenus un syndicat d'élus."
    ]
  },
  "piolle": {
    "heros": [
      "Grosso modo la 5G, c'est pour nous permettre de regarder des films porno même quand vous êtes dans votre ascenseur en HD."
    ],
    "celebration": [
      "Grosso modo la 5G, c'est pour nous permettre de regarder des films porno même quand vous êtes dans votre ascenseur en HD.",
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
    "heros": [
      "Quand une petite fille de 5 ans, 5 ans et demi, commence à vous déshabiller, c'est fantastique."
    ],
    "pose": [
      "Quand une petite fille de 5 ans, 5 ans et demi, commence à vous déshabiller, c'est fantastique.",
      "Qu'est-ce que ça peut te foutre ?",
      "La sexualité d'un gosse, c'est absolument fantastique […] Quand une petite fille de 5 ans commence à vous déshabiller, c'est fantastique, c'est un jeu érotico-maniaque..."
    ],
    "celebration": [
      "Mon pote, je te dis, jamais tu ne seras président de la République, parce que t'es trop minable.",
      "[…] mon pote, je te dis, jamais tu ne seras président de la République, parce que t'es trop minable.",
      "C'est fantastique parce que c'est un jeu absolument érotico-maniaque.",
      "Qu'est-ce que ça peut te foutre ?"
    ],
    "casserole": [
      "Mon pote, je te dis, jamais tu ne seras président de la République, parce que t'es trop minable.",
      "La sexualité d'un gosse, c'est absolument fantastique […] Quand une petite fille de 5 ans commence à vous déshabiller, c'est fantastique, c'est un jeu érotico-maniaque..."
    ]
  },
  "rousseau": {
    "heros": [
      "Je vis avec un homme déconstruit et je suis super heureuse."
    ],
    "pose": [
      "Je vis avec un homme déconstruit et je suis super heureuse.",
      "Il faut changer de mentalité pour que manger une entrecôte cuite sur un barbecue ne soit plus un symbole de virilité."
    ],
    "celebration": [
      "Rien à péter de leur rentabilité.",
      "Eh bien pourquoi pas…",
      "Il faut changer de mentalité pour que manger une entrecôte cuite sur un barbecue ne soit plus un symbole de virilité."
    ]
  },
  "tondelier": {
    "celebration": [
      "Je vais vous ajouter à mon compte pénibilité si on n'abroge pas la réforme des retraites.",
      "Vous, on vous a assez entendu ! Si vous voulez parler il fallait venir aux débats.",
      "Bah vous, ça vous a marqué visiblement.",
      "Le gouvernement a tout fait pour que cette manifestation soit un échec. Raté !"
    ],
    "pose": [
      "Vous, on vous a assez entendu ! Si vous voulez parler il fallait venir aux débats.",
      "Bah vous, ça vous a marqué visiblement."
    ],
    "casserole": [
      "Je souffre en vous écoutant à chaque seconde, je confirme.",
      "J'ai pas de souvenir. Je peux pas vous dire, je l'ai pas connu.",
      "Ce qui m'a marqué, c'est manger des pommes."
    ],
    "mort": [
      "J'ai pas de souvenir. Je peux pas vous dire, je l'ai pas connu.",
      "Ce qui m'a marqué, c'est manger des pommes."
    ]
  },
  "lassalle": {
    "celebration": [
      "Même si c'est France Info, c'est un chien. C'est un chien !"
    ],
    "pose": [
      "Même si c'est France Info, c'est un chien. C'est un chien !",
      "Je sais que je tiendrai tête à Monsieur Trump, à Monsieur Poutine, parce que moi j'ai eu affaire aux ours, aux loups et aux cavernes.",
      "Contrairement à France 2 qui est l'agence Tass et la Pravda réunies.",
      "Oui, je serai candidat à la présidentielle de 2022, si je suis en bonne santé !"
    ],
    "casserole": [
      "Ils me considèrent comme un candidat de merde et inutile ! De merde, oui !"
    ],
    "mort": [
      "Ils me considèrent comme un candidat de merde et inutile ! De merde, oui !"
    ],
    "heros": [
      "Je sais que je tiendrai tête à Monsieur Trump, à Monsieur Poutine, parce que moi j'ai eu affaire aux ours, aux loups et aux cavernes.",
      "Oui, je serai candidat à la présidentielle de 2022, si je suis en bonne santé !"
    ]
  },
  "asselineau": {
    "heros": [
      "Arrêtez de poser ce genre de questions pointues !",
      "Eh bien, moi, je suis plus courageux qu'eux qui sont des lâches.",
      "Dans sa tête, les Français sont un troupeau de veaux qu'il faut mener à l'abattoir !"
    ],
    "casserole": [
      "Arrêtez de poser ce genre de questions pointues !"
    ],
    "celebration": [
      "Eh bien, moi, je suis plus courageux qu'eux qui sont des lâches.",
      "Moi, j'ai 640 000 abonnés, c'est-à-dire deux fois plus que Mme Le Pen."
    ],
    "achat": [
      "Moi, j'ai 640 000 abonnés, c'est-à-dire deux fois plus que Mme Le Pen."
    ],
    "pose": [
      "Dans sa tête, les Français sont un troupeau de veaux qu'il faut mener à l'abattoir !"
    ]
  },
  "philippot": {
    "pose": [
      "On a non plus un ministre de l'Intérieur mais un menteur de l'Intérieur.",
      "La question de la culture du bonsaï compte aussi beaucoup, ce n'est pas pour autant que l'on va lancer un collectif sur le sujet."
    ],
    "celebration": [
      "On a non plus un ministre de l'Intérieur mais un menteur de l'Intérieur.",
      "Il a menti, il a perdu."
    ]
  },
  "dupont_aignan": {
    "mort": [
      "Je souhaite que par mon geste votre chaîne renoue un jour avec la démocratie.",
      "Je donne 2 jours à la chaîne TF1 pour inviter tous les candidats et pour permettre aux Français de trancher."
    ],
    "heros": [
      "Je souhaite que par mon geste votre chaîne renoue un jour avec la démocratie."
    ],
    "pose": [
      "Je donne 2 jours à la chaîne TF1 pour inviter tous les candidats et pour permettre aux Français de trancher.",
      "[…] rétablir à Cayenne un centre de détention qui permette d'isoler ces fous furieux.",
      "On va mettre autour du cou des Français une laisse."
    ],
    "prison": [
      "[…] rétablir à Cayenne un centre de détention qui permette d'isoler ces fous furieux."
    ],
    "casserole": [
      "On va mettre autour du cou des Français une laisse.",
      "[…] auront moins de droits qu'un fiché S terroriste."
    ]
  },
  "villiers": {
    "casserole": [
      "Je suis fier d'avoir vu mon fils rembarrer tous ces chacals.",
      "J'ai renoncé à tous mes droits. Je n'ai jamais touché un centime."
    ],
    "celebration": [
      "Je suis fier d'avoir vu mon fils rembarrer tous ces chacals.",
      "Le roi est nu, il ne reste que le casque et le scooter."
    ],
    "pose": [
      "L'atmosphère, c'est une atmosphère de pré-guerre civile.",
      "Le roi est nu, il ne reste que le casque et le scooter.",
      "En 1914, c'est tout le monde dans la tranchée. Aujourd'hui, c'est tout le monde au supermarché."
    ],
    "mort": [
      "Moi, j'ai quitté la scène."
    ],
    "heros": [
      "Moi, j'ai quitté la scène."
    ]
  },
  "knafo": {
    "casserole": [
      "Vous êtes le fils de, vous êtes le neveu de, etc. Donc, ça m'étonne beaucoup venant de vous !",
      "On est vraiment sur BFM, c'est vous qui créez la polémique et c'est vous qui la relancez."
    ],
    "celebration": [
      "Vous êtes le fils de, vous êtes le neveu de, etc. Donc, ça m'étonne beaucoup venant de vous !",
      "Je pense que personne n'attend plus rien de vous et vous trouvez quand même le moyen de décevoir."
    ],
    "pose": [
      "Je pense que personne n'attend plus rien de vous et vous trouvez quand même le moyen de décevoir.",
      "Cette interview commence mal pour le service public.",
      "On est vraiment sur BFM, c'est vous qui créez la polémique et c'est vous qui la relancez."
    ]
  },
  "messiha": {
    "heros": [
      "Je préfère faire une cagnotte pour un policier que pour un délinquant."
    ],
    "casserole": [
      "Je préfère faire une cagnotte pour un policier que pour un délinquant."
    ],
    "pose": [
      "Exterminer les antifas. Un par un. Les antifas sont les seuls uniques nazis aujourd'hui. Il faut les éradiquer."
    ]
  },
  "lafont": {
    "pose": [
      "[…] une population absolument pas intégrée et qui ne vit pas comme nous.",
      "Est-ce que je peux me marier avec mon chien alors ?"
    ],
    "casserole": [
      "Est-ce que je peux me marier avec mon chien alors ?"
    ]
  },
  "lalanne": {
    "heros": [
      "Citoyennes et Citoyens de la France ! La Patrie est en danger.",
      "Citoyennes et Citoyens de la France ! La Patrie est en danger"
    ],
    "pose": [
      "Citoyennes et Citoyens de la France ! La Patrie est en danger.",
      "Citoyennes et Citoyens de la France ! La Patrie est en danger",
      "Le chef de l'État et son gouvernement s'essuient les pieds sur le Droit Républicain comme sur un paillasson."
    ],
    "celebration": [
      "Citoyennes et Citoyens de la France ! La Patrie est en danger"
    ],
    "casserole": [
      "Le chef de l'État et son gouvernement s'essuient les pieds sur le Droit Républicain comme sur un paillasson."
    ],
    "mort": [
      "Il doit donc être destitué"
    ]
  },
  "branco": {
    "celebration": [
      "Votre émission est pornographique !",
      "Comment fabriquer une guillotine.",
      "Ils ne sont pas corrompus, ils sont la corruption.",
      "2027, c'est demain !"
    ],
    "pose": [
      "Votre émission est pornographique !",
      "Ils ne sont pas corrompus, ils sont la corruption.",
      "Comment fabriquer une guillotine"
    ],
    "heros": [
      "Ils ne sont pas corrompus, ils sont la corruption.",
      "2027, c'est demain !"
    ]
  },
  "rigault": {
    "mort": [
      "J'espère que je ne suis pas juste le jeune de Zemmour qu'on envoie pour se faire tabasser."
    ],
    "casserole": [
      "J'espère que je ne suis pas juste le jeune de Zemmour qu'on envoie pour se faire tabasser.",
      "Faut pas faire la vierge effarouchée."
    ],
    "pose": [
      "Je suis disponible et je n'ai pas peur du débat."
    ]
  },
  "peltier": {
    "pose": [
      "Tu vis, on te taxe ; tu meurs, on te taxe.",
      "Vous préférez Dubaï à l'Aubrac, et votre horizon se nomme RSA pour les uns, GPA pour les autres.",
      "J'ai un adversaire, c'est la gauche.",
      "Nous ne voulons plus du social qui nous ruine, nous voulons le travail qui rémunère !",
      "[…] avec beaucoup de gravité et d'enthousiasme."
    ],
    "celebration": [
      "Tu vis, on te taxe ; tu meurs, on te taxe.",
      "J'ai un adversaire, c'est la gauche.",
      "Vive la France et vive la Sologne. Et longue vie aux saisons.",
      "Nous ne voulons plus du social qui nous ruine, nous voulons le travail qui rémunère !"
    ],
    "mort": [
      "Tu vis, on te taxe ; tu meurs, on te taxe.",
      "[…] avec beaucoup de gravité et d'enthousiasme."
    ],
    "casserole": [
      "[…] avec beaucoup de gravité et d'enthousiasme."
    ],
    "heros": [
      "[…] avec beaucoup de gravité et d'enthousiasme."
    ]
  },
  "bay": {
    "pose": [
      "Mettre hors d'état de nuire les casseurs, la racaille.",
      "C'est totalement mensonger […] nos candidats disent la vérité.",
      "De la racaille d'extrême-gauche."
    ],
    "celebration": [
      "Mettre hors d'état de nuire les casseurs, la racaille."
    ],
    "casserole": [
      "À l'époque, je ne me suis pas du tout rendu compte. C'est un tort.",
      "C'est totalement mensonger […] nos candidats disent la vérité."
    ],
    "prison": [
      "À l'époque, je ne me suis pas du tout rendu compte. C'est un tort.",
      "A l'époque, je ne me suis pas du tout rendu compte. C'est un tort."
    ],
    "mort": [
      "A l'époque, je ne me suis pas du tout rendu compte. C'est un tort."
    ]
  },
  "marechal": {
    "heros": [
      "France is in the process of passing from the eldest daughter of the Catholic Church to the little niece of Islam.",
      "C'est un homme intéressant pour le débat public. Il va bousculer un peu tout le monde."
    ],
    "pose": [
      "France is in the process of passing from the eldest daughter of the Catholic Church to the little niece of Islam.",
      "C'est un homme intéressant pour le débat public. Il va bousculer un peu tout le monde.",
      "Si la famille n'est pas défendue, il n'est pas impossible que dans 60 ans la France devienne une République islamique."
    ],
    "celebration": [
      "C'est un homme intéressant pour le débat public. Il va bousculer un peu tout le monde."
    ]
  },
  "fournas": {
    "heros": [
      "Qu'il retourne en Afrique !"
    ],
    "pose": [
      "Qu'il retourne en Afrique !"
    ],
    "celebration": [
      "Bien évidemment, je ne m'excuserai pas.",
      "Qu'il retourne en Afrique !"
    ],
    "casserole": [
      "Bien évidemment, je ne m'excuserai pas.",
      "Je reste député. Ce que j'ai dit était tout à fait dans le champ républicain."
    ],
    "prison": [
      "Je reste député. Ce que j'ai dit était tout à fait dans le champ républicain."
    ]
  },
  "odoul": {
    "heros": [
      "Au nom de nos principes laïcs…"
    ],
    "pose": [
      "Au nom de nos principes laïcs…",
      "C'est peut-être pour célébrer quelque chose.",
      "Je ne suis pas blonde, moi.",
      "Est-ce que la corde est française ?"
    ],
    "casserole": [
      "Je ne m'en suis pas pris à une mère mais à un symbole !"
    ],
    "celebration": [
      "Je ne suis pas blonde, moi."
    ]
  },
  "chenu": {
    "pose": [
      "Cela suffit ce que vous venez de dire là !",
      "L'UMP est devenu le Tea Party à la française. Ils sont beaucoup plus conservateurs que le FN.",
      "[…] l'UMP est devenu le Tea Party à la française. Ils sont beaucoup plus conservateurs que le FN-RBM."
    ],
    "casserole": [
      "Si les juges veulent devenir les arbitres de la présidentielle, ils le feront."
    ],
    "celebration": [
      "Cela suffit ce que vous venez de dire là !"
    ],
    "heros": [
      "[…] l'UMP est devenu le Tea Party à la française. Ils sont beaucoup plus conservateurs que le FN-RBM."
    ]
  },
  "aliot": {
    "pose": [
      "Jaurès aurait voté Front national."
    ],
    "celebration": [
      "Quand quelqu'un traite tout le monde de fou, c'est que l'on est instable.",
      "Jaurès aurait voté Front national."
    ],
    "casserole": [
      "Je ne crois plus à rien avec la justice.",
      "L'épisode est clos.",
      "[…] interjeter appel dans les plus brefs délais et avec la ferme détermination de gommer cette injustice."
    ],
    "prison": [
      "Je ne crois plus à rien avec la justice.",
      "[…] interjeter appel dans les plus brefs délais et avec la ferme détermination de gommer cette injustice."
    ],
    "mort": [
      "L'épisode est clos."
    ]
  },
  "tanguy": {
    "heros": [
      "Oui, le travail rend libre.",
      "Je suis honoré de la confiance des électeurs, mais j'accueille ce résultat avec beaucoup d'humilité et beaucoup de distance."
    ],
    "pose": [
      "Oui, le travail rend libre.",
      "Voilà qu'un quarteron de procureurs et de juges prétend sortir du droit pour exercer la vendetta du système contre son seul opposant !",
      "Il y a un flagrant délit de faillite, vous êtes de toute évidence coupable.",
      "[…] il y a un flagrant délit de faillite, vous êtes de toute évidence coupable.",
      "Voilà qu'un quarteron de procureurs et de juges prétend sortir du droit pour exercer la vendetta du système […] !"
    ],
    "prison": [
      "Voilà qu'un quarteron de procureurs et de juges prétend sortir du droit pour exercer la vendetta du système contre son seul opposant !",
      "Voilà qu'un quarteron de procureurs et de juges prétend sortir du droit pour exercer la vendetta du système […] !"
    ],
    "celebration": [
      "Il y a un flagrant délit de faillite, vous êtes de toute évidence coupable.",
      "[…] il y a un flagrant délit de faillite, vous êtes de toute évidence coupable.",
      "Je suis honoré de la confiance des électeurs, mais j'accueille ce résultat avec beaucoup d'humilité et beaucoup de distance."
    ],
    "casserole": [
      "Personne ne le sait à part Jean-Marie Le Pen lui-même.",
      "Oui, le travail rend libre."
    ]
  },
  "mariani": {
    "heros": [
      "La Russie n'est pas une menace pour la France et l'Europe."
    ],
    "pose": [
      "La Russie n'est pas une menace pour la France et l'Europe."
    ]
  },
  "lavalette": {
    "pose": [
      "On habite loin, on est déconnecté, on ferme sa gueule !",
      "Tu casses, tu répares, s'égosillait Gabriel Attal. Mais dans la vraie vie, les émeutiers cassent, et les Français casquent.",
      "Un héros français et chrétien qui a porté jusqu'au bout l'idéal du sacrifice."
    ],
    "celebration": [
      "On habite loin, on est déconnecté, on ferme sa gueule !",
      "Tu casses, tu répares, s'égosillait Gabriel Attal. Mais dans la vraie vie, les émeutiers cassent, et les Français casquent."
    ]
  },
  "mc_lepen": {
    "celebration": [
      "Justice est faite, Marine Le Pen est éligible."
    ],
    "casserole": [
      "Justice est faite, Marine Le Pen est éligible."
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
  }
};

/** Une phrase de cette personne pour ce moment, une autre à chaque tour. Après le combat, la phrase se tire au hasard (src/client/tools/afterCombatSpeech.ts). */
export function phraseFor(id: string, moment: Moment, turn = 0): string | null {
  const list = PHRASES[id]?.[moment];
  if (!list || list.length === 0) return null;
  return list[turn % list.length];
}
