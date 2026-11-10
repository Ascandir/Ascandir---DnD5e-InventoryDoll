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
- Gegenstand auf einen Slot ziehen = ausgerüstet. Mit der Maus darüberfahren zeigt den Tooltip wie im normalen Inventar, Rechtsklick löst ihn als eigenes Fenster heraus. Umschalt + Rechtsklick = ablegen (landet im Primär-Behälter). Doppelklick öffnet den Gegenstand.
- Ausgerüstete Gegenstände erscheinen nur noch auf der Paperdoll, nicht mehr in der Liste rechts.
- **Waffensets:** 3 Sets mit Haupt- und Nebenhand. Eine Waffe liegt immer nur an einer Stelle – ziehst du sie in ein anderes Set, wird sie verschoben. Zweihandwaffen belegen beide Hände. Klick auf I / II / III wechselt das aktive Set; nur dessen Waffen gelten als ausgerüstet.
  Ist **Ascandir - Combat HUD** aktiv, sind es dieselben Waffensets wie im HUD.
- **Behälter-Slots:** Rucksack & Co. hineinziehen. Der erste Slot (★) ist der Primär-Behälter: Alles, was von der Paperdoll abgelegt wird, landet dort.
- **Köcher:** Liegt Munition in einem angebundenen Behälter, erscheint ein Auswahlfeld. Die gewählte Munition wird bei Fernkampfwaffen als Munition vorausgewählt.
- **Boden:** Gegenstand auf das Bodenfeld ziehen = neben dem eigenen Token ablegen (braucht *Ascandir - DnD5e Lootplacement* oder *Item Piles*).
- Der Zauberstab-Knopf oben sortiert bereits ausgerüstete Gegenstände automatisch in passende Slots.
- Wird ein Gegenstand in der Liste rechts ausgerüstet (Schild-Symbol), wandert er automatisch auf den passenden Slot – Waffen und Schilde ins aktive Waffenset. Ist der Slot belegt, wird getauscht und das Alte landet im Primär-Behälter.

**Rechts – Behälter**
- Traglast, Währung, Suche und Einstimmung bleiben wie im Standardbogen.
- Jeder angebundene Behälter erscheint als eigene, zuklappbare Liste mit Füllstand. Verbrauchsgüter lassen sich aus jedem Behälter direkt nutzen.
- Darunter die normale dnd5e-Liste für alles, was nicht verstaut ist.
- Gegenstände zwischen den Behältern hin- und herziehen funktioniert wie gewohnt.

**Seitenleiste:** Auf dem Inventar-Reiter wird die Seitenleiste eingeklappt (das Porträt ist ja in der Paperdoll). Auf allen anderen Reitern bleibt sie.

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
