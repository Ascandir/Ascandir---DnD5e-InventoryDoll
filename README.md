# Ascandir - DnD5e InventoryDoll

Ersetzt den Inventar-Reiter des dnd5e-Charakterbogens durch ein Inventar mit **Paperdoll**.

- **Foundry:** v14 (getestet mit 14.369.1)
- **System:** dnd5e 6.x (getestet mit 6.0.6)

## Installation

In Foundry unter *Module installieren* diesen Manifest-Link eintragen:

```
https://github.com/Ascandir/Ascandir---DnD5e-InventoryDoll/releases/latest/download/module.json
```

## Was das Modul macht

**Links – Paperdoll**
- Das Porträt des Charakters steht in der Mitte, die Ausrüstungs-Slots liegen darum herum, unten am Porträt die Rüstungsklasse.
- Gegenstand auf einen Slot ziehen = ausgerüstet. Mit der Maus darüberfahren zeigt den Tooltip wie im normalen Inventar, Rechtsklick löst ihn als eigenes Fenster heraus. Umschalt + Rechtsklick = ablegen (landet im Primär-Behälter). Klick auf einen Gegenstand löst seine Aktion aus (z. B. Angriff), Strg + Klick öffnet ihn.
- Ausgerüstete Gegenstände erscheinen nur noch auf der Paperdoll, nicht mehr in der Liste rechts.
- **Hände & Waffensets:** Unten an der Figur liegen Haupt- und Nebenhand als große Slots, dazwischen die Knöpfe **I / II / III** für das aktive Set. Zweihandwaffen belegen beide Hände (die Nebenhand zeigt sie blass an). Dieselbe Waffe darf in mehreren Sets liegen; eine Waffe auf einen Set-Knopf ziehen legt sie in dieses Set. Ist **Ascandir - Combat HUD** aktiv, sind es dieselben Waffensets wie im HUD.
- **Einstimmung:** Wer einen Gegenstand mit Einstimmungspflicht anlegt, stimmt sich automatisch ein, solange ein Platz frei ist. Wird er von der Paperdoll genommen, endet die Einstimmung. Ein kleines Sonnen-Symbol am Slot zeigt den Zustand (gold = eingestimmt, rot = fehlt).
- **Behälter-Slots** liegen rechts als einklappbare Leiste über den Behälterlisten. Rucksack & Co. hineinziehen; der erste Slot (★) ist der Primär-Behälter: Alles, was von der Paperdoll abgelegt wird, landet dort.
- **Köcher:** Liegt Munition in einem angebundenen Behälter, erscheint ein Auswahlfeld. Die gewählte Munition wird bei Fernkampfwaffen als Munition vorausgewählt.
- **Boden:** Gegenstand auf das Bodenfeld ziehen = neben dem eigenen Token ablegen (braucht *Ascandir - DnD5e Lootplacement* oder *Item Piles*).
- Der Zauberstab-Knopf oben sortiert bereits ausgerüstete Gegenstände automatisch in passende Slots.
- Wird ein Gegenstand in der Liste rechts ausgerüstet (Schild-Symbol), wandert er automatisch auf den passenden Slot – Waffen und Schilde ins aktive Waffenset. Ist der Slot belegt, wird getauscht und das Alte landet im Primär-Behälter.

**Rechts – Behälter**
- Traglast, Währung, Suche und Einstimmung bleiben wie im Standardbogen.
- Jeder angebundene Behälter erscheint als eigene, zuklappbare Liste mit Füllstand. Verbrauchsgüter lassen sich aus jedem Behälter direkt nutzen.
- Darunter die normale dnd5e-Liste für alles, was nicht verstaut ist.
- Gegenstände zwischen den Behältern hin- und herziehen verschiebt sie. Behälter selbst lassen sich an ihrem Kopf greifen und auf einen Behälter-Slot ziehen.
- Klick auf einen Gegenstand löst seine Aktion aus, Strg + Klick öffnet ihn.
- **Kampf:** Der SL schaltet pro Behälter (Faust-Symbol im Kopf), ob man im Kampf daran kommt. Aus gesperrten Behältern kann im Kampf nichts benutzt werden – auch nicht im Ascandir Combat HUD (ab v0.4.3).

**Seitenleiste:** Auf dem Inventar-Reiter wird die Seitenleiste eingeklappt (das Porträt ist ja in der Paperdoll). Auf allen anderen Reitern bleibt sie.

## Geldbörse (optional)

Der SL schaltet in den Moduleinstellungen (oder im Slot-Editor) **Geldbörsen verwenden** ein und legt fest, wie viele Münzen hineinpassen.

- Die normale Währung des Bogens verschwindet. Stattdessen zeigt das Inventar oben jede Geldbörse mit ihren Münzen und dem Füllstand.
- Eine Geldbörse ist ein Behälter. Der SL legt sie per Knopf an oder markiert einen beliebigen Behälter mit dem Münz-Symbol als Geldbörse. Die Kapazität kann er pro Geldbörse direkt im Bogen ändern.
- Geld, das von außen dazukommt oder abgeht (Belohnungen, Shops, andere Module), wird automatisch in die Geldbörsen gebucht. Passt nichts mehr hinein, trägt der Charakter die Münzen lose – das Inventar zeigt das als Warnung mit Knopf „In Geldbörse packen“.
- Der SL legt im Slot-Editor fest, welche Münzsorten es gibt (z. B. ohne Elektrum). Münzen abgeschalteter Sorten werden in die übrigen umgerechnet – auch wenn sie von außen dazukommen.
- Beim Ein- bzw. Ausschalten fragt das Modul, ob die Münzen aller Charaktere in die Geldbörsen bzw. zurück in die normale Währung wandern sollen.

## Für den SL

*Spieleinstellungen → Moduleinstellungen → Ascandir - DnD5e InventoryDoll → Slots bearbeiten*

Oder direkt im Charakterbogen: Bogen in den Bearbeiten-Modus schalten, dann oben an der Paperdoll auf das **Zahnrad** klicken. Im Editor führt „Alle Moduleinstellungen“ zu den übrigen Einstellungen.

- Ein Layout für **alle** Charaktere.
- **Irgendwo auf die Figur klicken** legt genau dort einen neuen Slot an (die **+** zeigen freie Vorschläge). Slots lassen sich mit der Maus verschieben.
- Jeder Typ darf mehrfach vorkommen – z. B. ein zweiter Kopf- oder Rüstungs-Slot. Ob das Sinn ergibt, entscheidet der SL.
- Slot anklicken → **Slot-Typ** wählen (Kopf, Augen, Hals, Umhang, Rüstung, Kleidung, Handgelenke, Hände, Gürtel, Füße, Ring, Schmuckstück, Fokus, Wundersam), Beschriftung ändern oder Slot entfernen.
- Anzahl der Behälter-Slots einstellen.

Weitere Einstellungen: Spieler dürfen ausrüsten, Slot-Typen streng prüfen, Getragenes in der Liste ausblenden, Ablegen auf den Boden.

### Wie erkennt das Modul den Slot-Typ?

- Rüstung, Kleidung und Ringe über den dnd5e-Ausrüstungstyp.
- Wundersame Gegenstände haben in dnd5e keinen Slot-Typ. Sie werden am **Namen** erkannt (Deutsch und Englisch, z. B. *Umhang/Cloak*, *Stiefel/Boots*, *Amulett/Amulet*).
- Klappt das nicht: Als SL beim Ablegen auf den Slot die **Umschalttaste** gedrückt halten. Der Gegenstand merkt sich den Slot-Typ dauerhaft.
