var URLRouter = require('./URLRouter');
var router = new URLRouter({
	pageNumber: '[1-9][0-9]*'
});



router.add('page-$page=pageNumber', 'A')
router.add('$product=string', 'B')
router.build();


console.info(router.get('page-1'))


