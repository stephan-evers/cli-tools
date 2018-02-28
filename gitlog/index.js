#!/usr/bin/env node

const spawn = require('child_process').spawn

if (typeof module != 'undefined' && module.parent) {
  module.exports = _gitlog
} else {
  const program = require('commander')

  program
    .version('0.1.0', '-v, --version')
    .option('-m, --month <month>', 'The month for the git log, starting at 1 for january.')
    .option('-y, --year <year>', 'The year for the git log, using this format YYYY.')
    .parse(process.argv);

  const path  = process.cwd();
  const date  = new Date()
  const month = parseInt(program.month) || date.getMonth() + 1
  const year  = parseInt(program.year) || date.getFullYear()

  console.log('gitlog', program.version())

  Promise.all([
    _spawn('git', ['config', 'user.name'], { cwd: path }),
    _spawn('git', ['config', 'remote.origin.url'], { cwd: path })
  ]).then(([user, remote]) => {
    console.log(`> commits for ${user} in ${remote}`)
    _gitlog(path, month, year, user)
      .then(commits => commits.forEach(commit => console.log(commit)))
  })
}

function _gitlog (path, month, year, user) {
  let from = ('0' + month).slice(-2)
  let until =  ('0' + (month + 1)).slice(-2)

  console.log("> from", from, "until", until, "of", year, "on all branches")

  return _spawn('git', [
    '--no-pager',
    'log',
    '--reverse',
    '--all',
    `--before="${year}-${until}-01T00:00:00"`,
    `--after="${year}-${from}-01T00:00:00"`,
    `--author=${user}`,
    `--pretty=tformat:%cd - %h -%d %s`,
    '--date=short',
    '--no-merges'
  ], { cwd: path })
}

function _spawn (command, args, options) {
  return new Promise((resolve, reject) => {
    var child = spawn(command, args, options);
    var output = [];

    child.stdout.on('data', data => output.push(data))
    child.stderr.on('data', data => output.push(data))

    child.on('close', code => {
      output = output
        .map(value => value.toString())
        .join('')
        .split('\n')
        .filter(Boolean)

      if (code === 0) {
        resolve(output)
      } else {
        reject(output)
      }
    })
  })
}
