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
- Gegenstand auf einen Slot ziehen = ausgerüstet. Rechtsklick auf einen belegten Slot = ablegen (landet im Primär-Behälter). Doppelklick öffnet den Gegenstand.
- **Waffensets:** 3 Sets mit Haupt- und Nebenhand. Zweihandwaffen belegen beide Hände. Klick auf I / II / III wechselt das aktive Set; nur dessen Waffen gelten als ausgerüstet.
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

- Ein Layout für **alle** Charaktere.
- An jedem freien Punkt um das Porträt gibt es ein **+**, um einen Slot hinzuzufügen.
- Slot anklicken → **Slot-Typ** wählen (Kopf, Augen, Hals, Umhang, Rüstung, Kleidung, Handgelenke, Hände, Gürtel, Füße, Ring, Schmuckstück, Fokus, Wundersam), Beschriftung ändern oder Slot entfernen.
- Anzahl der Behälter-Slots einstellen.

Weitere Einstellungen: Spieler dürfen ausrüsten, Slot-Typen streng prüfen, Getragenes in der Liste ausblenden, Ablegen auf den Boden.

### Wie erkennt das Modul den Slot-Typ?

- Rüstung, Kleidung und Ringe über den dnd5e-Ausrüstungstyp.
- Wundersame Gegenstände haben in dnd5e keinen Slot-Typ. Sie werden am **Namen** erkannt (Deutsch und Englisch, z. B. *Umhang/Cloak*, *Stiefel/Boots*, *Amulett/Amulet*).
- Klappt das nicht: Als SL beim Ablegen auf den Slot die **Umschalttaste** gedrückt halten. Der Gegenstand merkt sich den Slot-Typ dauerhaft.
