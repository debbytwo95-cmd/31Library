import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { syncCatalog } from './sync-catalog.mjs';

function fixture(t) {
    const prefix = path.join(os.tmpdir(), '31library-catalog-');
    const root = fs.mkdtempSync(prefix);
    t.after(() => {
        assert.ok(path.resolve(root).startsWith(path.resolve(prefix)));
        fs.rmSync(root, { recursive: true, force: true });
    });
    fs.mkdirSync(path.join(root, 'assets'));
    for (const category of ['button', 'background', 'label', 'text']) fs.mkdirSync(path.join(root, 'single-web/components', category), { recursive: true });
    fs.mkdirSync(path.join(root, 'single-web/components/button/example-studio'));
    fs.writeFileSync(path.join(root, 'single-web/components/button/example-studio/index.html'), '<main>Example</main>');
    fs.writeFileSync(path.join(root, 'assets/catalog-data.js'), 'window.LibraryCatalog = [{id:"example-studio",section:"components",category:"buttons",href:"./old/index.html",title:"Example"}];');
    return root;
}
function readData(root) {
    const window = {};
    for (const file of ['catalog-data.js', 'catalog-categories.js']) vm.runInNewContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), { window });
    return JSON.parse(JSON.stringify(window));
}
test('folder sync repairs moved entries and keeps empty categories visible', t => {
    const root = fixture(t);
    syncCatalog({ root });
    const data = readData(root);
    assert.equal(data.LibraryCatalog[0].category, 'button');
    assert.equal(data.LibraryCatalog[0].href, './single-web/components/button/example-studio/index.html');
    assert.deepEqual(data.LibraryCategories.map(item => item.id), ['button', 'background', 'label', 'text']);
    assert.doesNotThrow(() => syncCatalog({ root, check: true }));
    const before = fs.readFileSync(path.join(root, 'assets/catalog-data.js'), 'utf8');
    syncCatalog({ root });
    assert.equal(fs.readFileSync(path.join(root, 'assets/catalog-data.js'), 'utf8'), before);
});
test('a new category folder is discovered, and moving a project keeps its identity', t => {
    const root = fixture(t);
    syncCatalog({ root });
    fs.mkdirSync(path.join(root, 'single-web/components/carousel'));
    fs.renameSync(path.join(root, 'single-web/components/button/example-studio'), path.join(root, 'single-web/components/carousel/example-studio'));
    assert.throws(() => syncCatalog({ root, check: true }), /differ from folders/);
    syncCatalog({ root });
    const data = readData(root);
    assert.ok(data.LibraryCategories.some(item => item.id === 'carousel' && item.label === 'carousel'));
    assert.equal(data.LibraryCatalog[0].id, 'example-studio');
    assert.equal(data.LibraryCatalog[0].category, 'carousel');
    assert.match(data.LibraryCatalog[0].href, /carousel\/example-studio/);
});
test('unregistered projects and duplicate project names fail visibly', t => {
    const root = fixture(t);
    fs.mkdirSync(path.join(root, 'single-web/components/background/unregistered'));
    fs.writeFileSync(path.join(root, 'single-web/components/background/unregistered/index.html'), '');
    assert.throws(() => syncCatalog({ root }), /Register unregistered/);
    fs.mkdirSync(path.join(root, 'single-web/components/text/example-studio'));
    fs.writeFileSync(path.join(root, 'single-web/components/text/example-studio/index.html'), '');
    assert.throws(() => syncCatalog({ root }), /Duplicate project/);
});
