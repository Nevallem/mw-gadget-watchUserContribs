/**
 * Watches the contributions of a user
 *
 * @author [[w:pt:User:!Silent]]
 * @date 09/nov/2014
 * @update 07/jan/2021
 * @see [[phab:T2470]]
 */
/* jshint laxbreak: true, bitwise: false, forin: false, -W006 */
/* global mw, $ */

( function () {
'use strict';

// Messages
mw.messages.set( {
	// General
	'wuc-dialogTitleDefault': 'Contribuições vigiadas',
	'wuc-newNotification': 'Existem novas notificações',
	'wuc-lastEdit': 'A última edição do usuário foi em $1',
	'wuc-lastEditNone': 'O usuário ainda não editou',
	'wuc-about': 'Sobre o funcionamento do gadget',
	'wuc-about-content': 'O gadget utiliza-se dos <a href="/wiki/Cookies" target="_blank">cookies</a> do seu navegador para amarzenar a sua lista de usuários vigiados. Isso significa que, caso você resolva '
		+ 'limpar os seus dados de navegação (incluindo os cookies) ou por ventura vier a trocar de navegador, a lista se perderá. Para evitar que isso ocorra, '
		+ 'existe tem a possibilidade de salvar a sua lista, através da ferramenta de importação e exportação. '
		+ 'Para qualquer dúvida ou problema referente ao gadget, basta informar em <a href="/wiki/MediaWiki_Discussão:Gadget-watchUserContribs.js" target="_blank">MediaWiki Discussão:Gadget-watchUserContribs.js</a>.',

	// Import/Export
	'wuc-importExport': 'Importar/Exportar lista de vigiados',
	'wuc-importExport-chooseOption': 'O que você deseja',
	'wuc-import': 'Importar',
	'wuc-import-sucess': '<span style="color:green;">Lista importada com sucesso</span>',
	'wuc-import-fail': '<span style="color:red;">Ocorreu algum problema ao tentar importar a lista</span>',
	'wuc-import-text': 'Cole aqui o código que você havia previamente salvo em seu computador e clique em "Salvar" para importar a lista.',
	'wuc-import-append': 'Anexar',
	'wuc-import-append-about': 'Selecionando esta opção, a lista a ser importada não sobrescreverá a sua atual lista de vigiados, assim, preservando-a.',
	'wuc-export': 'Exportar',
	'wuc-export-text': 'Você deverá copiar todo o conteúdo presente abaixo e salvá-lo no seu computador (preferêncialmente em um bloco de notas). Quando precisar reaver a sua lista novamente, basta '
		+ 'utilizar a ferramenta de importação. Tome cuidado para não fazer quaisquer modificações no código abaixo, pois a mínima alteração feita sem o conhecimento necessário '
		+ 'pode acabar gerando problemas ao tentar importar a lista posteriormente.',

	// Verify
	'wuc-verify-newContrib': 'O editor realizou novas edições',
	'wuc-verify-verifying': 'Verificando $1 de $2 ($3%)',
	'wuc-verify-restart': 'Verificação finalizada. Clique para iniciar novamente',
	'wuc-verify-starting': 'Iniciando verificação...',

	// Watch
	'wuc-watch-list': 'Lista de usuários que você vigia ($1 no total)',
	'wuc-watch-limitReached': 'Você atingiu o limite de editores vigiados.',
	'wuc-watch-none': 'Você ainda não tem nenhuma contribuição vigiada.',
	'wuc-watch-success': 'Usuário adicionado a sua lista de vigiados com sucesso.',

	// Unwatch
	'wuc-unwatch-removeSuccess': 'Usuário removido da sua lista de vigiados com sucesso.',
	'wuc-unwatch-alreadyUnwatch': 'Você já havia deixado de vigiar o usuário.',
	'wuc-unwatch-sure': 'Tem certeza que dejesa deixar de vigiar este usuário?',
	'wuc-unwatch-selectAll': 'Selecionar tudo',
	'wuc-unwatch-serveral': 'Você realmente deseja deixar de vigiar os editores selecionados?',
	'wuc-unwatch-none': 'Você não selecionou nenhum editor.',

	// Buttons
	'wuc-button-openDialog': 'Contribuições vigiadas',
	'wuc-button-watch': 'Vigiar as contribuições do usuário',
	'wuc-button-unwatch-1': 'Deixar de vigiar as contribuições do usuário',
	'wuc-button-unwatch-2': 'deixar de vigiar',
	'wuc-button-contribs': 'contribuições',
	'wuc-button-yes': 'Sim',
	'wuc-button-no': 'Não',
	'wuc-button-close': 'Fechar',
	'wuc-button-save': 'Salvar',
} );

/**
 * @object WatchUsersContributions
 */
var wuc = {
	/** Messages
	 * @param {string} name Name of the message
	 * @param {string|number} [$N] Dynamic parameters to the message (i.e. the values for $1, $2, etc)
	 * @see [[mw:ResourceLoader/Default_modules#mediaWiki.message]]
	 * @return {string}
	 */
	message: function ( /*name[, $1[, $2[, ... $N ]]]*/ ) {
		return mw.message.apply( this, arguments ).plain();
	},

	/**
	 * Returns a value in localStorage
	 * @param {string} storage Storage place
	 * @return {Array}
	 */
	getStorageValue: function ( storage ) {
		return localStorage[ storage ] ? localStorage[ storage ].split( ',' ) : [];
	},

	/**
	 * Unwatch a user
	 * @param {string} user
	 * @param {boolean} [notReopen] Not re-open the watchlist
	 * @return {undefined}
	 */
	unwatch: function ( user, notReopen ) {
		var storage, index;

		storage = wuc.getStorageValue( 'wuc-watchedUsers' );
		index = storage.indexOf( user );
		storage.splice( index, 1 );
		localStorage[ 'wuc-watchedUsers' ] = storage.join( ',' );

		storage = wuc.getStorageValue( 'wuc-lastEdits' );
		storage.splice( index, 1 );
		localStorage[ 'wuc-lastEdits' ] = storage.join( ',' );

		if ( !notReopen ) {
			wuc.watchlist();
		}
	},

	/**
	 * Appends a value to the local storage
	 * @param {string} storage Storage place
	 * @param {string|number|boolean} value
	 * @return {boolean} returns false if not was possible stores the value
	 */
	pushValueStorage: function ( storage, value ) {
		if ( !localStorage[ storage ] ) {
			localStorage[ storage ] = value;
		} else {
			try {
				localStorage[ storage ] += ',' + value;
			} catch ( e ) {
				wuc.dialog( {
					content: wuc.message( 'wuc-watch-limitReached' )
				} );

				return false;
			}
		}

		return true;
	},

	/**
	 * Set the date of the last edit of user
	 * @param {number} pos Position to set the timestamp (in localStorage)
	 * @param {string|number|boolean} value
	 * @return {undefined}
	 */
	setTimestampLastContrib: function ( pos, value ) {
		var edits = wuc.getStorageValue( 'wuc-lastEdits' );

		// -1 removes the date
		if ( value === -1 ) {
			edits.splice( pos, 1 );
		} else {
			edits.splice( pos, 1, value );
		}

		localStorage[ 'wuc-lastEdits' ] = edits;
	},

	/**
	 * Get the last contribution of a user
	 * @param {string} user
	 * @return {jQuery.Deferred}
	 */
	getLastContrib: function ( user ) {
		var lastEdit,
			apiDeferred = $.Deferred();

		$.get(
			mw.util.wikiScript( 'api' ), {
				list: 'usercontribs',
				uclimit: '1',
				ucprop: 'timestamp',
				ucuser: user,
				ucdir: 'older',
				format: 'json',
				action: 'query'
			},
			function ( data ) {
				lastEdit = data.query && data.query.usercontribs && data.query.usercontribs[ 0 ];
				apiDeferred.resolve( new Date( lastEdit ? lastEdit.timestamp : 0 ).getTime() );
			}
		);

		return apiDeferred.promise();
	},

	/**
	 * Creates a dialog
	 * @param {jQuery.dialog} info Dialog info
	 * @param {boolean} [isDefault] If is the default prompt
	 * @return {jQuery}
	 */
	dialog: function ( info, isDefault ) {
		var buttons = {},
			$wucDialog = $( '<div class="wuc-dialog ui-widget"></div>' ).append( info.content );

		isDefault = ( isDefault === undefined ) ? true : isDefault;

		if ( isDefault ) {
			buttons[ wuc.message( 'wuc-button-close' ) ] = function () {
				// If the main dialog is closed, close all of them
				if ( info.dialogClass.indexOf( 'wuc-dialog-main' ) !== -1 ) {
					$( '.wuc-dialog' ).each( function () {
						$( this ).dialog( 'close' );
					} );
				} else {
					$( this ).dialog( 'close' );
				}
			};

			info.dialogClass = 'wuc-dialog-default' + ( info.dialogClass !== undefined ? ' ' + info.dialogClass : '' );
			info.buttons = buttons;
		}

		$.extend( info, {
			title: info.title || wuc.message( 'wuc-dialogTitleDefault' ),
			modal: ( info.modal === undefined ) ? true : info.modal,
			resizable: false,
			open: function () {
				$( '.ui-dialog-titlebar-close' ).hide();
			},
			close: function () {
				$wucDialog.dialog( 'destroy' ).remove();
			}
		} );

		return $wucDialog.dialog( info );
	}
};

/**
 * Import/Export watchlist tool
 * @return {undefined}
 */
wuc.importExportTool = function () {
	var attachRaw, generateRaw,
		buttons = {};

	// Import watchlist
	attachRaw = function () {
		var property,
			prefixError = 'wuc.importExportTool.attachRaw: ',
			raw = {},
			propertiesList = [ 'wuc-watchedUsers', 'wuc-lastEdits', 'wuc-notifications', 'wuc-notifications-count', 'wuc-newContribsUsers' ];

		$( '#wuc-import-textarea' ).val().split( '|' ).splice( 1, 5 ).forEach( function( data ) {
			data = data.split( / ?= ?/ );
			raw[ data[ 0 ] ] = !data[ 1 ] ? data[ 1 ] : data[ 1 ].replace( /\n/g, '' );
		} );

		try {
			// Verifies if have at least one property
			if ( $.isEmptyObject( raw ) ) {
				throw new Error( prefixError + 'expected \'|\' symbol.' );
			}

			// Verifies if have the main properties (wuc-watchedUsers and wuc-lastEdits)
			if ( raw[ 'wuc-watchedUsers' ] === undefined && raw[ 'wuc-lastEdits' ] === undefined ) {
				throw new Error( prefixError + 'missing \'wuc-watchedUsers\' and \'wuc-lastEdits\' property.' );
			}

			// Verifies if have the main property 'wuc-watchedUsers'
			if ( raw[ 'wuc-watchedUsers' ] === undefined ) {
				throw new Error( prefixError + 'missing \'wuc-watchedUsers\' property.' );
			}

			// Verifies if have the main property 'wuc-lastEdits'
			if ( raw[ 'wuc-lastEdits' ] === undefined ) {
				throw new Error( prefixError + 'missing \'wuc-lastEdits\' property.' );
			}

			// Verifies if the main properties are both empty
			if ( raw[ 'wuc-watchedUsers' ] === '' && raw[ 'wuc-lastEdits' ] === '' ) {
				throw new Error( prefixError + 'both \'wuc-watchedUsers\' and \'wuc-lastEdits\' properties are empty.' );
			}

			// Verifies consistency between main properties (wuc-watchedUsers and wuc-lastEdits)
			if ( ( raw[ 'wuc-watchedUsers' ].split( ',' ).length !== raw[ 'wuc-lastEdits' ].split( ',' ).length )
				|| ( raw[ 'wuc-watchedUsers' ] === '' || raw[ 'wuc-lastEdits' ] === '' )
			) {
				throw new Error( prefixError + 'inconsistency between the values of the \'wuc-watchedUsers\' and \'wuc-lastEdits\' properties.' );
			}

			for ( property in raw ) {
				// Verifies if property is valid
				if ( $.inArray( property, propertiesList ) === -1 || raw[ property ] === undefined ) {
					throw new Error( prefixError + 'unknown property.' );
				}

				// If is empty, replace '\n' to ''
				if ( raw[ property ].search( /^(\n+)$/ ) !== -1 ) {
					raw[ property ] = '';
				}

				// Verifies problems in value passed
				if ( raw[ property ] !== ''
					&& ( raw[ property ].search( /\w/ ) === -1 || raw[ property ].search( /,[\s\n]*?$/ ) !== -1 )
				) {
					throw new Error( prefixError + 'bad value passed through \'' + property + '\' property.' );
				}

				if ( $( '#wuc-import-append' ).prop( 'checked' ) ) {
					wuc.pushValueStorage( property, raw[ property ].replace( /\n$/, '' ) );
				} else {
					localStorage[ property ] = raw[ property ].replace( /\n$/, '' );
				}
			}

			$( '#wuc-import-result' ).html( wuc.message( 'wuc-import-sucess' ) );
			wuc.watchlist();
		} catch ( e ) {
			$( '#wuc-import-result' ).html( wuc.message( 'wuc-import-fail' ) + '<sup class="wuc-import-what" title="' + e.message + '">?</sup>' );
			$( '.wuc-import-what' ).tipsy();
		}
	};

	// Export watchlist
	generateRaw = function () {
		var raw = '|wuc-watchedUsers=' + wuc.getStorageValue( 'wuc-watchedUsers' )
			+ '\n|wuc-lastEdits=' + wuc.getStorageValue( 'wuc-lastEdits' )
			+ '\n|wuc-notifications=' + wuc.getStorageValue( 'wuc-notifications' )
			+ '\n|wuc-notifications-count=' + wuc.getStorageValue( 'wuc-notifications-count' )
			+ '\n|wuc-newContribsUsers=' + wuc.getStorageValue( 'wuc-newContribsUsers' );

		$( '#wuc-export-textarea' ).val( raw );
	};

	buttons[ wuc.message( 'wuc-button-close' ) ] = function () {
		$( this ).dialog( 'close' );
	};

	if ( $( '.wuc-dialog' ).eq( 1 ).length ) {
		$( '.wuc-dialog' ).eq( 1 ).dialog( 'close' );
	}

	wuc.dialog( {
		height: 500,
		width: 500,
		modal: false,
		title: wuc.message( 'wuc-importExport' ),
		content:  wuc.message( 'wuc-importExport-chooseOption' ) + ':<br />'
			+ '<label><input type="radio" name="wuc-importExport-option" value="import" /> ' + wuc.message( 'wuc-import' ) + '</label><br />'
			+ '<label><input type="radio" name="wuc-importExport-option" value="export" /> ' + wuc.message( 'wuc-export' ) + '</label>'
			+ '<br /><br /><hr /><br />'
			+ '<div id="wuc-import">'
				+ wuc.message( 'wuc-import-text' ) + '<br />'
				+ '<textarea id="wuc-import-textarea" />'
				+ '<span id="wuc-import-result"></span>'
				+ '<label for="wuc-import-append">' + wuc.message( 'wuc-import-append' )
					+ '<sup class="wuc-import-what" title="' + wuc.message( 'wuc-import-append-about' ) + '">?</sup><input type="checkbox" id="wuc-import-append" />'
				+ '</label>'
				+ '<button class="wuc-buttons ui-button ui-corner-all ui-button-text-only" id="wuc-import-save">'
					+ '<span class="ui-button-text">' + wuc.message( 'wuc-button-save' ) + '</span>'
				+ '</button><br /><br />'
			+ '</div>'
			+ '<div id="wuc-export">'
				+ wuc.message( 'wuc-export-text' ) + '<br />'
				+ '<textarea id="wuc-export-textarea" />'
			+ '</div>',
		buttons: buttons
	} );

	$( 'input[name="wuc-importExport-option"]' ).change( function () {
		if ( $( this ).val() === 'import' ) {
			$( '#wuc-import-textarea' ).removeClass( 'wuc-fillField' ).val( '' );
			$( '#wuc-import-result' ).html( '' );
			$( '#wuc-import' ).fadeIn( 'slow' );
			$( '#wuc-export' ).hide();
		} else {
			$( '#wuc-export' ).fadeIn( 'slow' );
			$( '#wuc-import' ).hide();
			generateRaw();
		}
	} );

	$( '#wuc-import-save' ).click( function () {
		if ( $( '#wuc-import-textarea' ).val() === '' ) {
			$( '#wuc-import-textarea' ).addClass( 'wuc-fillField' );
			$( '#wuc-import-result' ).html( '' );
			return;
		} else {
			$( '#wuc-import-textarea' ).removeClass( 'wuc-fillField' );
		}

		attachRaw();
	} );

	$( '.wuc-import-what' ).tipsy();
};

/**
 * Show the list of users watched
 * @return {undefined}
 */
wuc.watchlist = function () {
	var i, j, swap,
		$watchlist = $( '.wuc-dialog' ).eq( 0 ),
		newer = wuc.getStorageValue( 'wuc-newContribsUsers' ),
		usersWatched = wuc.getStorageValue( 'wuc-watchedUsers' ),
		usersLastEdits = wuc.getStorageValue( 'wuc-lastEdits' ).reverse();

	// Put on the top the users with a new contribution
	for ( i = 0; i < usersWatched.length; i++ ) {
		for ( j = 0; j < usersWatched.length - 1; j++ ) {
			if ( wuc.getStorageValue( 'wuc-notifications' ).indexOf( usersWatched[ j ] ) !== -1 ) {
				swap = usersWatched[ j ];
				usersWatched[ j ] = usersWatched[ j + 1 ];
				usersWatched[ j + 1 ] = swap;
			}

			if ( newer.indexOf( usersWatched[ j ] ) !== -1 ) {
				swap = usersWatched[ j ];
				usersWatched[ j ] = usersWatched[ j + 1 ];
				usersWatched[ j + 1 ] = swap;
			}
		}
	}

	usersWatched = usersWatched.reverse();

	$watchlist.html(
		'<div style="float: right;">'
			+ '<button class="wuc-buttons" id="wuc-about" title="' +  wuc.message( 'wuc-about' ) + '">'
				+ '<img src="https://upload.wikimedia.org/wikipedia/commons/1/18/About_icon_%28The_Noun_Project%29.svg" height="25" width="25" />'
			+ '</button> '
			+ '<button class="wuc-buttons" id="wuc-import-export" title="' +  wuc.message( 'wuc-importExport' ) + '">'
				+ '<img src="https://upload.wikimedia.org/wikipedia/commons/f/fc/Ic_import_export_48px.svg" height="25" width="25" />'
			+ '</button>'
		+ '</div>'
	);

	if ( !usersWatched.length ) {
		$watchlist.append( wuc.message( 'wuc-watch-none' ) );
	} else {
		$watchlist.append(
			wuc.message( 'wuc-watch-list', usersWatched.length ) + ': <br /><br />'
			+ '<label><input type="checkbox" id="wuc-unwatch-markAll" />' + wuc.message( 'wuc-unwatch-selectAll' ) + '</label> | '
			+ '<a id="wuc-unwatch-mass" href="#">' + wuc.message( 'wuc-button-unwatch-2' ) + '</a> editores selecionados<br />'
		);
	}

	// Generates the watchlist
	for ( i = 0; i < usersWatched.length; i++ ) {
		$watchlist.append( '<input type="checkbox" class="wuc-unwatch-several" /> '
			+ '<a title="'
				+ ( usersLastEdits[ i ] === '0' ? wuc.message( 'wuc-lastEditNone' ) : wuc.message( 'wuc-lastEdit', new Date( parseInt( usersLastEdits[ i ] ) ).toLocaleString() ) )
			+ '" class="wuc-watched" href="' + ( mw.util.isIPAddress( usersWatched[ i ] )
				? '/wiki/Special:Contributions/'
				: '/wiki/User:'
			) + usersWatched[ i ] + '" target="_blank">' + usersWatched[ i ] + '</a> ('
		);

		if ( !mw.util.isIPAddress( usersWatched[ i ] ) ) {
			$watchlist.append( '<a href="/wiki/Special:Contributions/' + usersWatched[ i ] + '" target="_blank">' + wuc.message( 'wuc-button-contribs' ) + '</a> | ' );
		}

		$watchlist.append(
			'<a class="wuc-unwatch" href="#' + usersWatched[ i ] + '">' + wuc.message( 'wuc-button-unwatch-2' ) + '</a>)'
			+ ( wuc.getStorageValue( 'wuc-notifications' ).indexOf( usersWatched[ i ] ) !== -1
				? ' <span class="'
					+ ( newer.indexOf( usersWatched[ i ] ) === -1
						? 'wuc-newContrib-late'
						: 'wuc-newContrib-early'
					) + '">' + wuc.message( 'wuc-verify-newContrib' ) + '</span>'
				: ''
			)
			+ '<br />'
		);

		if ( newer.indexOf( usersWatched[ i ] ) !== -1 ) {
			newer.splice( newer.indexOf( usersWatched[ i ] ), 1 );
			localStorage[ 'wuc-newContribsUsers' ] = newer;
		}
	}

	$( '.wuc-dialog .wuc-watched' ).tipsy();
	$( '.wuc-dialog .wuc-buttons' ).tipsy();

	$( '.wuc-unwatch' ).click( function () {
		var buttons = {},
			user = $( this ).attr( 'href' ).split( '#' )[ 1 ];

		buttons[ wuc.message( 'wuc-button-yes' ) ] = function () {
			$( this ).dialog( 'close' );
			wuc.unwatch( user );
		};

		buttons[ wuc.message( 'wuc-button-no' ) ] = function () {
			$( this ).dialog( 'close' );
		};

		wuc.dialog( {
			content: wuc.message( 'wuc-unwatch-sure' ),
			buttons: buttons
		}, false );

	} );

	$( '#wuc-unwatch-markAll' ).click( function () {
		if ( $( '#wuc-unwatch-markAll' ).prop( 'checked' ) ) {
			$( '.wuc-unwatch-several' ).each( function () {
				$( this ).prop( 'checked', true );
			} );
		} else {
			$( '.wuc-unwatch-several' ).each( function () {
				$( this ).prop( 'checked', false );
			} );
		}
	} );

	$( '#wuc-unwatch-mass' ).click( function () {
		var buttons = {};

		if ( !$( '.wuc-unwatch-several:checked' ).length ) {
			wuc.dialog( {
				content: wuc.message( 'wuc-unwatch-none' )
			} );

			return;
		}

		buttons[ wuc.message( 'wuc-button-yes' ) ] = function () {
			var index,
				$checkedList = $( '.wuc-unwatch-several:checked' );

			$checkedList.each( function () {
				index = $( this ).index( '.wuc-unwatch-several:checked' );

				if ( $( this ).prop( 'checked' ) ) {
					wuc.unwatch( $checkedList.eq( index ).next().text(), index < $( '.wuc-unwatch-several:checked' ).length - 1 );
				}
			} );

			$( this ).dialog( 'close' );
		};

		buttons[ wuc.message( 'wuc-button-no' ) ] = function () {
			$( this ).dialog( 'close' );
		};

		wuc.dialog( {
			content: wuc.message( 'wuc-unwatch-serveral' ),
			buttons: buttons
		}, false );
	} );

	$( '#wuc-about' ).click( function () {
		wuc.dialog( {
			height: 'auto',
			width: 500,
			content: wuc.message( 'wuc-about-content' )
		} );

		$( '.wuc-dialog a' ).blur();
	} );


	$( '#wuc-import-export' ).click( function () {
		wuc.importExportTool();
	} );
};

/**
 * Verifies if a user of the watchlist realizes an edition
 * @param {number} [next] For internal use
 * @return {undefined}
 */
wuc.sniffer = function ( next ) {
	var count,
		usersWatched = wuc.getStorageValue( 'wuc-watchedUsers' ),
		timestampList = wuc.getStorageValue( 'wuc-lastEdits' ),
		i = usersWatched.length;

	if ( next >= 0 ) {
		i = next;
	}

	wuc.getLastContrib( usersWatched[ i ] ).done( function ( lastEdit ) {
		if ( lastEdit > timestampList[ i ] ) {
			wuc.setTimestampLastContrib( i, lastEdit );

			if ( $.inArray( usersWatched[ i ], wuc.getStorageValue( 'wuc-notifications' ) ) === -1 ) {
				wuc.pushValueStorage( 'wuc-notifications', usersWatched[ i ] );
			}

			if ( $.inArray( usersWatched[ i ], wuc.getStorageValue( 'wuc-newContribsUsers' ) ) === -1 ) {
				wuc.pushValueStorage( 'wuc-newContribsUsers', usersWatched[ i ] );
			}

			count = wuc.getStorageValue( 'wuc-newContribsUsers' ).length >> 0;

			if ( !$( '#wuc-notification' ).hasClass( 'wuc-haveNotify' ) ) {
				$( '#wuc-notification' )
					.show()
					.addClass( 'wuc-haveNotify' )
					.attr( 'title', wuc.message( 'wuc-newNotification' ) )
					.html( '1' );
			} else {
				$( '#wuc-notification' ).html( count );
			}

			$( '#wuc-notification' ).removeClass( 'wuc-notification-none' );

			localStorage[ 'wuc-notifications-count' ] = count;
		}

		$( '#wuc-notification-verifying' ).html(
			wuc.message( 'wuc-verify-verifying', ( usersWatched.length - --i ), usersWatched.length, ( ( usersWatched.length - i ) / usersWatched.length * 100 ).toPrecision( 3 ) )
		);

		if ( i >= 0 && usersWatched.length !== 0 ) {
			wuc.sniffer( i );
		} else {
			$( '#wuc-notification-verifying' )
				.html( wuc.message( 'wuc-verify-restart' ) )
				.css( 'cursor', 'pointer' )
				.click( function () {
					$( this )
						.html( wuc.message( 'wuc-verify-starting' ) )
						.css( 'cursor', 'default' )
						.off( 'click' );
					wuc.sniffer();
				} );
		}
	} );
};

/**
 * Runs
 * @return {undefined}
 */
wuc.run = function () {
	var user, notifications,
		i = -1,
		usersWatched = wuc.getStorageValue( 'wuc-watchedUsers' ),
		button = '<span id="wuc-openDialog" class="mw-ui-button mw-ui-progressive">' + wuc.message( 'wuc-button-openDialog' ) + '</span>'
			+ '<span id="wuc-notification" class="wuc-notification-none">0</span> <span id="wuc-notification-verifying"></span>';

	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Watchlist' ) {
		if ( !!$( '.mw-rcfilters-ui-table' ).length ) {
			$( '.mw-rcfilters-ui-cell' ).eq( 2 ).append( button );
		} else {
			$( '#mw-watchlist-resetbutton' ).after( button );
		}

		if ( ( wuc.getStorageValue( 'wuc-notifications-count' ) >> 0 ) > 0 ) {
			$( '#wuc-notification' )
				.show()
				.addClass( 'wuc-haveNotify' )
				.removeClass( 'wuc-notification-none' )
				.attr( 'title', wuc.message( 'wuc-haveNotify' ) )
				.html( wuc.getStorageValue( 'wuc-notifications-count' ) );
		}

		$( '#wuc-openDialog' ).click( function () {
			if ( $( '.wuc-dialog-main' ).length ) {
				return;
			}

			wuc.dialog( {
				height: 600,
				width: 600,
				modal: false,
				dialogClass: 'wuc-dialog-main'
			} );
			wuc.watchlist();
			$( '#wuc-notification' ).html( '0' ).addClass( 'wuc-notification-none' ).removeClass( 'wuc-haveNotify' );

			localStorage[ 'wuc-notifications-count' ] = '';
		} );

		if ( usersWatched.length ) {
			wuc.sniffer();
			$( '#wuc-notification-verifying' ).html( wuc.message( 'wuc-verify-starting' ) );
		}
	} else if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Contributions' ) {
		user = window.decodeURI( mw.util.getUrl().split( '/' )[ 3 ] || mw.util.getParamValue( 'target' ) ).replace( /_/g, ' ' );
		notifications = wuc.getStorageValue( 'wuc-notifications' );

		if ( mw.util.isIPAddress( user.split( '/' )[ 0 ] ) && user.indexOf( '/' ) !== -1 ) {
			return;
		}

		$( '#contentSub' ).append(
			'<br /><button id="wuc-watch" class="mw-ui-button mw-ui-progressive">'
				+ wuc.message( 'wuc-button-' + ( $.inArray( user, usersWatched ) === -1
					? 'watch'
					: 'unwatch-1'
				) )
			+ '</button>'
		);

		if ( notifications.indexOf( user ) !== -1 ) {
			notifications.splice( notifications.indexOf( user ), 1 );
			localStorage[ 'wuc-notifications' ] = notifications.join( ',' );
			localStorage[ 'wuc-notifications-count' ] = ( wuc.getStorageValue( 'wuc-notifications-count' ) >> 0 ) - 1;
		}

		$( '#wuc-watch' ).click( function () {
			usersWatched = wuc.getStorageValue( 'wuc-watchedUsers' );

			if ( $.inArray( user, usersWatched ) === -1 && $( this ).html() !== wuc.message( 'wuc-button-unwatch-1' ) ) {
				wuc.getLastContrib( user ).done( function ( lastEdit ) {
					var storage;

					// If is full
					if ( !wuc.pushValueStorage( 'wuc-lastEdits', lastEdit ) ) {
						return false;
					}

					// If is full
					if ( !wuc.pushValueStorage( 'wuc-watchedUsers', user ) ) {
						// If 'wuc-watchedUsers' is full but 'wuc-lastEdits' not, remove his last element
						if ( wuc.getStorageValue( 'wuc-lastEdits' ).length > wuc.getStorageValue( 'wuc-watchedUsers' ).length ) {
							storage = wuc.getStorageValue( 'wuc-lastEdits' );
							storage.splice( storage.length - 1, 1 );
							localStorage[ 'wuc-lastEdits' ] = storage.join( ',' );
						}

						return false;
					}

					mw.notify( wuc.message( 'wuc-watch-success' ) );
					$( '#wuc-watch' ).html( wuc.message( 'wuc-button-unwatch-1' ) );
				} );
			} else {
				i = -1;

				while ( i++ < usersWatched.length ) {
					if ( user === usersWatched[ i ] ) {
						usersWatched.splice( i, 1 );
						localStorage[ 'wuc-watchedUsers' ] = usersWatched;

						mw.notify( wuc.message( 'wuc-unwatch-removeSuccess' ) );
						$( this ).html( wuc.message( 'wuc-button-watch' ) );
						wuc.setTimestampLastContrib( i, -1 );

						return;
					}
				}

				mw.notify( wuc.message( 'wuc-unwatch-alreadyUnwatch' ) );
				$( this ).html( wuc.message( 'wuc-button-watch' ) );
			}
		} );
	}

};


var localStorageAvailable = ( function () {
	try {
		return window.localStorage;
	} catch ( e ) {}
}() );

if ( localStorageAvailable ) {
	$( wuc.run );
}

}() );
