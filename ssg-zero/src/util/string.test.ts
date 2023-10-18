import assert from 'node:assert/strict';
import { describe as suite, test } from 'node:test';
import { capitalize, toKebabCase, toPascalCase } from './string.js';

suite('capitalize', function () {
  test('leaves an empty string untouched', function () {
    assert.equal(capitalize(''), '');
  });
  test('capitalizes a camelCased word', function () {
    assert.equal(capitalize('oCamlMyCamel'), 'OCamlMyCamel');
  });
});

suite('toPascalCase', function () {
  test('leaves an empty string untouched', function () {
    assert.equal(toPascalCase(''), '');
  });
  test('transforms camelCased word', function () {
    assert.equal(toPascalCase('oCamlMyCamel'), 'OCamlMyCamel');
  });
  test('transforms snake_cased word', function () {
    assert.equal(toPascalCase('arbok_rettan_pokemon'), 'ArbokRettanPokemon');
  });
  test('transforms kebab-cased word', function () {
    assert.equal(toPascalCase('black-blood-black-tears'), 'BlackBloodBlackTears');
  });
});

suite('toKebabCase', function () {
  test('leaves an empty string untouched', function () {
    assert.equal(toKebabCase(''), '');
  });
  test('leaves kebab-case untouched', function () {
    assert.equal(toKebabCase('eat-my-kebab'), 'eat-my-kebab');
  });
  test('transforms camelCased word', function () {
    assert.equal(toKebabCase('oCamlMyCamel'), 'o-caml-my-camel');
  });
  test('transforms snake_cased word', function () {
    assert.equal(toKebabCase('arbok_rettan_pokemon'), 'arbok-rettan-pokemon');
  });
  test('transforms PascalCased word', function () {
    assert.equal(toKebabCase('BlairePascalDidSomethingWithPhysics'), 'blaire-pascal-did-something-with-physics');
  });
});
