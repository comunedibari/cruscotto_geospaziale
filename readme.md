# Cruscotto GeoSpaziale
# Gestionale di toponomastica

## INTRODUZIONE
Lo scopo principale di questa applicazione è la gestione web-based del grafo stradale e del civilario unico di un ente territoriale.

## Licenza
Il software è rilasciato con licenza aperta ai sensi dell'art. 69 comma 1 del Codice dell’[Amministrazione Digitale](https://www.agid.gov.it/it/design-servizi/riuso-open-source/linee-guida-acquisizione-riuso-software-pa) con una licenza [AGPL-3.0 or later](https://spdx.org/licenses/AGPL-3.0-or-later.html)

## INFORMAZIONI GENERALI
In coerenza con la programmazione nazionale/regionale in ambito di "Città e comunità intelligenti" e in linea con gli obiettivi dell'Agenda Digitale dell'amministrazione comunale, l'applicazione "Cruscotto GeoSpaziale" è una delle soluzioni prodotte nell'ambito del progetto "Città Connessa: Sistema Informativo per il controllo degli oggetti" (cod. progetto BA 1.1.1.d – CUP J91J17000130007) a valere su risorse di finanziamento PON METRO 2014-2020 – Asse 1 "Agenda Digitale".

L'applicazione "Cruscotto GeoSpaziale" offre una serie di funzionalità per la gestione del grafo stradale e di altri tematismi cartografici.

Per grafo si intende una struttura topologica composta da archi e nodi. Nel caso particolare di grafo stradale i nodi del grafo rappresentano gli incroci e gli archi i tratti di strada che vanno da incrocio a incrocio (ovvero da nodo a nodo). Sono definiti vertici i cambi di direzione degli archi. Caratteristica del grafo stradale è che tutti gli archi che lo compongono sono denominati, ovvero sono associati al nome della via ovvero ad un toponimo (una via è composta da uno o più archi). La soluzione "Cruscotto GeoSpaziale" è un web GIS fruibile via web che permette la navigazione delle informazioni e dei contenuti attraverso l'interazione diretta con la mappa quale strumento principale di analisi e ricerca sul territorio ed editing delle informazioni relative al grafo stradale (Toponomastica, Civici, Archi, Nodi, etc.).

Si tratta di una applicazione web basata su una architettura conforme alla tipica struttura three-tier che rappresenta un paradigma caratterizzato da rilevanti benefici in termini di scalabilità e di uso efficiente delle risorse. I tre livelli "logici" (front-end, back-end e database) sono realizzati sfruttando i principali framework di riferimento per lo sviluppo quali ad esempio Angular e Bootstrap oltreché di settore come OpenLayers (per lo sviluppo delle funzionalità cartografiche del sistema), Node.JS (per l'implementazione di soluzioni "server-side"), Geoserver (come map server) e RDBMS PostgreSQL/PostGIS (per l'archiviazione dei dati). 

![alt-text](https://github.com/comunedibari/cruscotto_geospaziale/blob/main/Documentazione%20tecnica/immagini/Immagine1.png)

Di seguito i sotto-moduli che costituiscono il front-end ed il back-end
- back-end: contiene i seguenti moduli di backend:
    - **EntityManager**: componente principale del back end deputata alla gestione delle entità  rappresenta l'astrazione del livello dei dati nell'architettura del sistema di centrale in quanto fornisce una rappresentazione a oggetti dei dati del dominio e l'astrazione del DBMS adottato, ovvero l'assoluta indipendenza delle funzioni dell'applicazione dal RDBMS
    - **EventEngine**:  gestore eventi è un modulo di fondamentale importanza per l'intero funzionamento del sistema: il suo compito è quello di ricevere tutti gli eventi emessi da un qualsiasi componente interno al sistema o esterno, classificarli, processarli, salvarli nella base dati. L'evento è rappresentato da un'entità contenente alcuni attributi obbligatori (sorgente, tipo, data di creazione, ...) ed una serie di attributi custom che caratterizzano il particolare tipo di evento. Dal punto di vista pratico può essere visto come una notifica che un qualunque modulo, in un certo istante, deve inviare ad altri moduli del sistema.
- front-end: contiene i seguenti moduli di frontend:
	- **Core**: contiene le funzioni di core quali gestione form, tabelle, etc.
    - **Dictionary**: contiene le funzionalità di gestione dei dizionari dati che popolano i menu a tendina
    - **Gistools**: contiene i tool di interazione con la cartografia
    - **Grafo**: contiene tutte le funzionalità di gestione del grafo stradale (gestione toponimi, archi, civici, edifici, nodi)
    - **Userrole**: contiene la gestione degli utenti e dei permessi
    - **Webgis**: modulo di frontend del motore cartografico


### Funzionalità del cruscotto geospaziale
Il cruscotto geospaziale consente:
- **gestione vie**:la gestione delle vie permette l'inserimento, la modficica, la cessazione e la ridenominazione di un toponimo
- **gestione civici**: queste funzionalità  permettono di interagire con la numerazione civica. Un numero civico è caratterizzato dall’associazione ad un arco (quello sul quale ricade la propria proiezione) e l’appartenenza a uno o più edifici. Un numero civico “Estensione” è un numero civico associato ad un civico principale che però può avere edifici diversi dal principale ma stesso arco e via. Le funzionalità che permettono di interagire con la numerazione civica sono:
	- Visualizzazione e modifica degli attributi alfanumerifci di un civico
	- Inserimento di un nuovo civico
	- Spostamento di un numero civico
	- Cancellazione di un numero civico esiste
- **gestione archi stradali**:Per grafo si intende una struttura topologica composta da archi e nodi. Nel caso particolare di grafo stradale i nodi del grafo rappresentano gli incroci e gli archi i tratti di strada che vanno da incrocio a incrocio. I vertici sono cambi di direzione sugli archi. É bene puntualizzare la differenza tra nodi e vertici: i nodi sono degli oggetti fondamentali del grafo (sono infatti codificati); i vertici invece sono oggetti puramente geometrici.Le funzionalità che permettono di interagire con la parte geometrica del grafo sono le seguenti:
	- Visualizzazione e modifica degli attributi alfanumerifci
	- Inserimento di un nuovo arco
	- Cancellazione di un arco esistente
	- Spezzamento di un arco
	- Unione di due archi stradali
	- Sagomatura di un arco stradale
	- Ridenominazione di un arco stradale
	- Spostamento di un nodo
- **gestione edifici**:funzionalità che permettono di interagire con gli edifici. In particolare:
	- Visualizzazione e modifica degli attributi di edifici
	- Inserimento di un nuovo edificio
	- Modifica di un edificio
	- Cancellazione di un edificio esistente
- **funzioni di amministrazione**: raccolgono le funzioni di gestione degli utenti , dei ruoli e delle componti cartografiche
Per i dettagli funzionali si rimanda al manuale utente.

**Installazione di un ambiente locale di sviluppo**
Per l'instalalzione di un ambiente fare riferimento al manuale di installazione SPCL3-ManualeInstallazione_CruscottoGeospatial_BD_IoT_1.0.pdf