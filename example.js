db.collection('movies').aggregate([
  {
    $match: {
      $text: {
        $search: 'matrix',
      },
    },
  },
  { $sort: { released: -1 } },
  { $project: { title: 1 } },
  { $limit: 5 },
]);
