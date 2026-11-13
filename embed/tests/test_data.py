from rally_embed.data import activity_docs, ontology, realistic_test, train_pairs


def test_every_activity_has_a_doc():
    assert set(activity_docs()) == set(ontology.activity_ids())


def test_realistic_labels_are_valid():
    ids = set(ontology.activity_ids())
    rows = realistic_test()
    assert len(rows) >= 80
    assert all(a in ids for _, a in rows)


def test_realistic_set_is_held_out():
    train = {p["anchor"].split(": ", 1)[1].lower() for p in train_pairs(2000)}
    assert not any(t.lower() in train for t, _ in realistic_test())


def test_gear_aliases_use_ontology_ids():
    from rally_embed.data import GEAR_ALIASES

    assert set(GEAR_ALIASES) <= set(ontology.activity_ids())


def test_pairs_cover_all_activities():
    docs = set(activity_docs().values())
    assert {p["positive"] for p in train_pairs(3000)} == docs
