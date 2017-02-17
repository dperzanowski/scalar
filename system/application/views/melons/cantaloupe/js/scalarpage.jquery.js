/**
 * Scalar
 * Copyright 2013 The Alliance for Networking Visual Culture.
 * http://scalar.usc.edu/scalar
 * Alliance4NVC@gmail.com
 *
 * Licensed under the Educational Community License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

(function($) {

    $.scalarpage = function(e, options) {

        var element = e;
        var commentDialog;

        var page = {

            options: $.extend({}, options),

            annotatedMedia: [],
            containingPaths: [],
            containingPath: null,
            containingPathNodes: [],
            elementsWithIncrementedData: [],
            pathIndex: null,
            gallery: null,
            bodyCopyWidth: null,
            pageWidth: null,
            pageWidthMinusMargins: null,
            isFullScreen: false,
            lastOrientation: null,
            mobileWidth: 520, // this should be set to the same value as the mobile (tiny.css) breakpoint in responsive.css
            adaptiveMedia: 'full',
            generateIconCache: {},
            mapMarkers: [],

            incrementData: function(selection, data) {
                var value = selection.data(data);
                if (value != undefined) {
                    value++;
                } else {
                    value = 1;
                }
                if (page.elementsWithIncrementedData.indexOf(selection) == -1) {
                    page.elementsWithIncrementedData.push(selection);
                }
                selection.data(data, value);
                return value;
            },

            clearIncrementedData: function() {

                var i,
                    n = page.elementsWithIncrementedData.length;

                for (i = 0; i < n; i++) {
                    page.elementsWithIncrementedData[i].removeData();
                }
                page.elementsWithIncrementedData = [];
            },

            handleMediaElementMetadata: function(event, link) {

                var mediaelement = link.data('mediaelement'),
                    mediaWidth = mediaelement.model.element.find('.mediaObject').width(),
                    isInline = link.hasClass("inline"),
                    size = mediaelement.model.options.size,
                    isFullWidth = false;

                if (mediaelement.model.node == scalarapi.model.getCurrentPageNode()) {
                    page.addContext(mediaelement.model.node);
                }

                if (page.adaptiveMedia == 'mobile') {
                    size = 'full';
                }

                temp = $('<div class="small_dim"></div>');
                temp.appendTo('.page');
                var minTabWidth = parseInt(temp.width());
                temp.remove();

                mediaelement.model.element.find("video").bind("webkitbeginfullscreen", function(e) {
                    page.isFullScreen = true;
                    page.lastOrientation = ((Math.abs(window.orientation) === 90) ? "landscape" : "portrait");
                });

                mediaelement.model.element.find("video").bind("webkitendfullscreen", function(e) {
                    page.isFullScreen = false;
                    // if orientation changed while we were full screen, then check to see if media needs to be reformatted
                    var currentOrientation = ((Math.abs(window.orientation) === 90) ? "landscape" : "portrait");
                    if (page.lastOrientation != currentOrientation) {
                        page.handleDelayedResize();
                    }
                });

                // 'full' and 'native' sized media get special sizing treatment
                if (size == 'native' || size == 'full') {

                    // if the media is the full width of the page, then remove any align styles
                    if (mediaWidth >= page.pageWidth) {
                        mediaelement.model.element.parent().removeClass('left right');
                        isFullWidth = true;

                        // if the media is smaller than than the width of the page, but larger than the width of the
                        // page minus its margins, then center it and add pillarboxing to separate it from the
                        // rest of the page
                    } else if (size == 'full' || mediaWidth > page.bodyCopyWidth) {
                        mediaelement.model.element.css({
                            'margin-right': 'auto',
                            'margin-left': 'auto',
                            'float': 'none'
                        });
                        mediaelement.model.element.find('.mediaObject').css({
                            'margin-right': 'auto',
                            'margin-left': 'auto',
                        });
                        if (mediaelement.model.element.parents('.manual_slideshow').length == 0) {
                            mediaelement.model.element.parent().addClass("pillarbox");
                        }
                        mediaelement.model.element.parent().removeClass('left right');
                        isFullWidth = true;

                        // otherwise, left align it with the body copy
                    } else if (isInline && mediaelement.model.element.parents('.body_copy').length == 0) {
                        link.data('slot').wrap('<div class="body_copy"></div>');
                    }

                    // If the media is smaller than the "small" size, remove tabs below media
                    if (mediaWidth < minTabWidth) {
                        mediaelement.model.options.solo = true;
                    }


                    if (isFullWidth) {
                        link.data('fullWidth', isFullWidth);
                        // full width native elements should have no body_copy wrapping them
                        // and they should come after their link, not before
                        if (size == 'native') {
                            // remove body_copy wrapper for inline elements
                            if (isInline) {
                                // Don't unwrap the inline element if it's parent is the main content wrapper
                                if (link.data('slot').parent('[property="sioc:content"]').length == 0) {
                                    link.data('slot').unwrap();
                                }

                                link.data('slot').css('clear', 'both');

                                // align full size elements below their links instead of above
                            } else {
                                link.data('slot').insertAfter(link.parents('.paragraph_wrapper'));
                            }


                        }
                    }
                }

                // the "solo" option is used when showing media items that don't get media details tabs beneath
                if (mediaelement.model.options.solo != true) {
                    if (isFullWidth) {

                        // create and add the element where media tabs will appear
                        var infoElement = $('<div></div>');
                        mediaelement.model.element.parent().after(infoElement);

                        // make sure the tags are aligned left with the body copy
                        infoElement.addClass("body_copy");

                        // modify default media element design
                        mediaelement.model.element.css('marginBottom', '0');
                        mediaelement.view.footer.hide();

                        // add the tabs
                        $.scalarmedia(mediaelement, infoElement, {
                            'shy': false,
                            'details': page.mediaDetails,
                            'caption': link.attr('data-caption')
                        });

                    } else {

                        // -- will this ever happen?
                        // make sure the tags are aligned left with the body copy
                        // if ( size == "full" ) {
                        // mediaelement.view.footer.addClass( "body_copy" );
                        // }

                        // add the tabs
                        $.scalarmedia(mediaelement, mediaelement.view.footer, {
                            'shy': (!isMobile && !link.hasClass('media-page-link')),
                            'details': page.mediaDetails,
                            'caption': link.attr('data-caption')
                        });
                    }
                } else {
                    if (isFullWidth) {
                        // modify default media element design
                        mediaelement.model.element.css('marginBottom', '0');
                        mediaelement.view.footer.hide();
                    }
                }

                // make images that don't come from Critical Commons open the image file in a new tab when clicked
                if (document.location.href.indexOf('.annotation_editor') == -1) {
                    if ((mediaelement.model.node.current.mediaSource.contentType == 'image') && (mediaelement.model.node.current.sourceFile.indexOf('criticalcommons.org') == -1)) {
                        mediaelement.model.element.find('.mediaObject').click(function() {
                            window.open(mediaelement.model.node.current.sourceFile, 'popout');
                        }).css('cursor', 'pointer');
                    }
                }

                // show the media
                mediaelement.model.element.css('visibility', 'visible');

                // add the media icon next to the link
                link.addClass('texteo_icon');
                link.addClass('texteo_icon_' + mediaelement.model.node.current.mediaSource.contentType);

            },

            handleSetState: function(event, data) {

                page.hideNote();

                switch (data.state) {

                    case ViewState.Reading:
                        if (data.instantaneous) {
                            $('.page').removeClass('fade_out instantaneous_fade_out');
                        } else {
                            //$('.page').stop().fadeIn();
                            $('.page').removeClass('fade_out instantaneous_fade_out');
                        }
                        $('body').css('overflow-y', 'auto');
                        break;

                    case ViewState.Navigating:
                        if (data.instantaneous) {
                            $('.page').addClass('instantaneous_fade_out');
                        } else {
                            //$('.page').stop().fadeOut();
                            $('.page').addClass('fade_out');
                            /*$( '.page' ).addClass( 'fade_out' ).delay( 1000 ).queue( 'fx', function( next ) {
                            	//$( this ).css( 'display', 'none' );
                            	next();
                            } );*/
                        }
                        $('body').css('overflow-y', 'hidden');
                        break;

                    case ViewState.Modal:
                        $('body').css('overflow-y', 'hidden');
                        break;

                }

            },

            calculatePageDimensions: function() {

                page.pageWidth = parseInt($('.page').width());

                // calculate the size of the content area minus margins
                var temp = $('<div class="body_copy"></div>');
                temp.appendTo('.page');
                page.pageWidthMinusMargins = page.pageWidth - (parseInt(temp.css('padding-left')) * 2);
                page.bodyCopyWidth = temp.width();
                temp.remove();

            },

            addMediaElementForLink: function(link, parent, height) {

                var inline = link.hasClass('inline'),
                    size = link.attr('data-size'),
                    align = link.attr('data-align');

                // default alignment is 'right'
                if (align == undefined) {
                    align = 'right';
                }

                // on small screens, all media are set to 'full' size
                if (page.adaptiveMedia == 'mobile') {
                    size = 'full';

                    // default size is 'medium'
                } else if (size == undefined) {
                    size = 'medium';
                }

                // create a temporary element and remove it so we can get its width; this allows us to specify
                // the various media element widths via CSS
                var temp = $('<div class="' + size + '_dim"></div>');
                temp.appendTo('.page');
                var width = Math.min(page.pageWidth, parseInt(temp.width()));
                temp.remove();

                // inline media elements can't get bigger than the width of the body copy
                if (inline) {
                    // we want 'large' inline media to be as wide as the text
                    if (size == 'large') {
                        width = page.bodyCopyWidth;
                    }
                } else {
                    // break point for large media elements to become full
                    if ((size == 'large') && ((page.pageWidthMinusMargins - page.bodyCopyWidth) < 160)) {
                        size = "full";
                        width = page.pageWidth;
                        // break point for medium media elements to become full
                    } else if ((size == 'medium') && (width > (page.bodyCopyWidth - 160))) {
                        size = "full";
                        width = page.pageWidth;
                    }
                }

                var currentNode = scalarapi.model.getCurrentPageNode();
                var options = {
                    url_attributes: ['href', 'src'],
                    autoplay: link.attr('data-autoplay') == 'true',
                    solo: link.attr('data-caption') == 'none',
                    getRelated: ($('[resource="' + currentNode.url + '"][typeof="scalar:Media"]').length > 0), // only get related content if this is a media page
                    typeLimits: typeLimits
                };

                // media at 'full' size get a maximum height
                if (size == 'full' || size == 'native') {
                    if (height == null) {
                        height = maxMediaHeight; // this varies depending on window size
                    } else {
                        options.vcenter = true;
                    }
                    var parent_temp = $('link#parent').attr('href');
                    var mediaNode = scalarapi.getNode(parent_temp + link.attr('resource'));
                }
                options.size = size;

                // create the slot where the media will be added
                slot = link.slotmanager_create_slot(width, height, options);

                // if the slot was successfully created,
                if (slot) {

                    // hide the media element until we get it fully set up (after its metadata has loaded)
                    slotDOMElement = slot.data('slot');
                    slotMediaElement = slot.data('mediaelement');

                    slotMediaElement.model.element.css('visibility', 'hidden');

                    // if this is an inline media element, then
                    if (inline) {

                        // hide its originating link (which we created dynamically anyway)
                        link.after(slotDOMElement);
                        link.hide();

                        var node = scalarapi.getNode(slotMediaElement.model.meta);
                        var specifiesDimensions = false;
                        if ((node != null) && (node.current.mediaSource.browserSupport[scalarapi.scalarBrowser] != null)) {
                            specifiesDimensions = node.current.mediaSource.browserSupport[scalarapi.scalarBrowser].specifiesDimensions;
                        }

                        if (size != 'full') {

                            // wrap the media in a body copy element so its alignment happens inside the
                            // dimensions of the body copy
                            if (!slotDOMElement.parent().hasClass('body_copy')) {
                                slotDOMElement.wrap('<div class="body_copy"></div>');
                            }

                            // align the media appropriately
                            if (align == 'right') {
                                slotMediaElement.model.element.css('float', 'right');
                            } else if (align == 'left') {
                                slotMediaElement.model.element.css('float', 'left');
                            } else if (align == 'center') {
                                slotMediaElement.model.element.css('margin-right', 'auto');
                                slotMediaElement.model.element.css('margin-left', 'auto');
                            }

                        } else {
                            slotDOMElement.addClass('left');
                        }

                        slotDOMElement.parent().nextAll(".paragraph_wrapper").eq(0).css("clear", "both");

                        // if this is not an inline media element, and its size isn't set to 'full', then
                    } else if (size != 'full') {

                        // put the media before its linking text, and align it appropriately
                        parent.before(slotDOMElement);
                        slotDOMElement.addClass(align);

                        // if this is the top-most linked media, then align it with the top of its paragraph
                        count = page.incrementData(parent, align + '_count');
                        if (count == 1) {
                            slotDOMElement.addClass('top');
                        }

                        // if this is not an inline media element, and its size is set to 'full', then put the media after its linking text
                    } else {
                        var embedLocation = parent.nextAll('.slot.full, .body_copy.mediainfo').last();
                        if (embedLocation.length == 0) {
                            embedLocation = parent;
                        }
                        embedLocation.after(slotDOMElement);
                        slotDOMElement.addClass('full');
                    }

                    return slot.data('mediaelement');
                }

            },

            // gathers info about this node's containing paths -- must be called before addHeaderPathInfo and addRelationshipNavigation
            getContainingPathInfo: function() {

                var queryVars = scalarapi.getQueryVars(document.location.href),
                    currentNode = scalarapi.model.getCurrentPageNode();

                page.containingPaths = currentNode.getRelatedNodes('path', 'incoming');

                // if we're on one of the containing paths, make it first in the list
                page.containingPaths.sort(function(a, b) {
                    var pathSlug;
                    if (queryVars.path) {
                        var temp = queryVars.path.split('/');
                        pathSlug = temp[temp.length - 1];
                    }
                    if (a.slug == pathSlug) {
                        return -1;
                    } else if (b.slug == pathSlug) {
                        return 1;
                    }
                    return 0;
                });

                // get siblings and index of the path we're on
                if (page.containingPaths.length > 0) {
                    page.containingPath = page.containingPaths[0]; // most of the time we only care about the first containing path
                    page.containingPathNodes = page.containingPath.getRelatedNodes('path', 'outgoing');
                    page.containingPathIndex = page.containingPathNodes.indexOf(currentNode);
                }

            },

            addContext: function(node) {
                var contextMarkup = '';
                var currentNode;
                if (node == null) {
                    currentNode = scalarapi.model.getCurrentPageNode();
                } else {
                    currentNode = node;
                }
                var i, relation, relations;

                $('.context.popover').remove();
 
                relations = currentNode.getRelations('referee', 'incoming'); 
                for (i in relations) {
                    relation = relations[i];
                    if (relation.body.current.content != null) {
                        contextMarkup += '<p class="attribution"><b>Cited in <a href="' + relation.body.url + '">&ldquo;' + relation.body.getDisplayTitle() + '&rdquo;</a>:</b></p>';
                        var temp = $('<div>'+relation.body.current.content+'</div>');
                        wrapOrphanParagraphs(temp);
                        var is_inline = (temp.find('a[resource*="'+relation.target.slug+'"]').hasClass('inline')) ? true : false;
                        if (is_inline) {
                            citingContent = '<i>Inline media</i>';
                        } else {
                            temp.find('a[resource*="'+relation.target.slug+'"]').addClass('context-citation');
                            citingContent = '&ldquo;'+temp.find('a[resource*="'+relation.target.slug+'"]').parent().html()+'&rdquo;';  // Media page could have been edited since the link was established, making 'mediaelement.model.node.current' not-found
                        }
                        contextMarkup += '<p>' + citingContent + '</p>';
                    }
                }
                
                // show containing paths
                relations = currentNode.getRelations('path', 'incoming', 'index');
                for (i in relations) {
                    relation = relations[i];
                    contextMarkup += '<p><a href="' + currentNode.url + '">Step ' + relation.index + '</a> of the <a href="' + relation.body.url + '">&ldquo;' + relation.body.getDisplayTitle() + '&rdquo;</a> path</p>';
                }
                
                // show tags
                relations = currentNode.getRelations('tag', 'incoming');
                for (i in relations) {
                    relation = relations[i];
                    contextMarkup += '<p>Tagged by <a href="' + relation.body.url + '">&ldquo;' + relation.body.getDisplayTitle() + '&rdquo;</a></p>';
                }

                if (contextMarkup != '') {
                    //contextMarkup = '<div class="citations">' + '<b>Context for this item</b>' + contextMarkup + '</div>';
                    contextMarkup = '<div class="citations">' + contextMarkup + '</div>';
                    var contextButton = $('<img class="path-nav info" title="Citations and context" data-toggle="popover" data-placement="bottom" src="' + page.options.root_url + '/images/info@2x.png" alt="up arrow"/>').insertBefore($('nav'));
                    contextButton.popover({
                        trigger: "click",
                        html: true,
                        content: contextMarkup,
                        template: '<div class="context popover caption_font" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div>' });

                }
            },

            addHeaderPathInfo: function() {

                // show containing path in header
                if (page.containingPaths.length > 0) {
                    if (page.containingPathNodes.length > 1) {
                        $('h1[property="dcterms:title"]').before('<div class="caption_font path-breadcrumb"><a href="' + page.containingPath.url + '">' + page.containingPath.getDisplayTitle() + '</a> (' + (page.containingPathIndex + 1) + '/' + page.containingPathNodes.length + ')</div>');
                    } else {
                        $('h1[property="dcterms:title"]').before('<div class="caption_font path-breadcrumb"><a href="' + page.containingPath.url + '">' + page.containingPath.getDisplayTitle() + '</a></div>');
                    }
                }

            },

            addPathButton: function(direction, destinationNode, pathNode) {
            	var prefix;
            	var popooverPlacement;
            	var pathVar;
            	var content;
            	switch (direction) {

            		case "up":
            		prefix = "Up to";
            		popooverPlacement = "bottom";
            		pathVar = '';
            		break;

            		case "down":
            		prefix = "Begin with";
            		popooverPlacement = "top";
            		pathVar = "?path=" + pathNode.slug;
            		break;

            		case "left":
            		prefix = "Back to";
            		popooverPlacement = "right";
            		pathVar = "?path=" + pathNode.slug;
            		break;

            		case "right":
            		prefix = "Continue to";
            		popooverPlacement = "left";
            		pathVar = "?path=" + pathNode.slug;
            		break;

            	}
            	content = prefix + ' <b>“' + destinationNode.getDisplayTitle() + '”</b>';
            	var thumbnailURL = destinationNode.getAbsoluteThumbnailURL();
            	if (thumbnailURL != null) {
            		content = '<img class="thumbnail" height="120" src=\"' + thumbnailURL + '\" alt=\"Thumbnail image of destination content\"/><br>' + content;
            	}
                var arrow = $('<a class="path-nav ' + direction + '" data-toggle="popover" data-placement="' + popooverPlacement + '" href="' + destinationNode.url + pathVar + '"><img src="' + page.options.root_url + '/images/arrow_' + direction + '@2x.png" alt="' + direction + ' arrow"/></a>').insertBefore($('nav'));
            	arrow.popover({
            		trigger: "hover click",
            		html: true,
            		content: content,
            		template: '<div class="popover caption_font path-nav-popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>' });
            },

            // Currently used options: showLists, showParentNav, showChildNav, showLateralNav, isCentered, showAnno, showComments, showTags
            addRelationshipNavigation: function(options) {

                var button, href, pathContents, section, nodes, node, link, links, selfType,
                    currentNode = scalarapi.model.getCurrentPageNode(),
                    pathOptionCount = 0,
                    containingPathOptionCount = 0,
                    queryVars = scalarapi.getQueryVars(document.location.href),
                    foundQueryPath = (queryVars.path != null);

                if (currentNode.baseType == 'http://scalar.usc.edu/2012/01/scalar-ns#Composite') {
                    selfType = 'page';
                } else if (currentNode.baseType == 'http://scalar.usc.edu/2012/01/scalar-ns#Media') {
                    selfType = 'media';
                } else {
                    selfType = 'content';
                }

                // path contents
                $('.path_of').each(function() {
                    if ($(this).parent().is('section')) {

                        pathContents = $(this).parent();
                        pathContents.addClass('relationships');
                        pathContents.show();

                        if (options.showLists) {

                            pathContents.find('h1').text('Contents');

                            pathContents.find('[property="dcterms:title"] > a').each(function() {
                                var href = $(this).attr('href') + '?path=' + currentNode.slug;
                                $(this).attr('href', href);
                            });

                        } else {
                            pathContents.find('h1').hide();
                            pathContents.find('ol').hide();
                        }

                        // "begin with" button
                        if ((pathOptionCount == 0) && options.showChildNav) {
                            nodes = currentNode.getRelatedNodes('path', 'outgoing');
                            if (nodes.length > 0) {
                                button = $('<p><a class="path_begin nav_btn" href="' + nodes[0].url + '?path=' +
                                    currentNode.slug + '">Begin with &ldquo;' + nodes[0].getDisplayTitle() +
                                    '&rdquo;</a></p>').appendTo(pathContents);
                                button.find('a').addClass('primary');
                                pathOptionCount++;
                                page.addPathButton('down', nodes[0], currentNode);
                            }
                        }

                    }
                });

                // path back/continue buttons
                if ((page.containingPaths.length > 0) && options.showLateralNav) {
                    section = $('<section class="relationships"></section');

                    page.addPathButton('up', page.containingPath, page.containingPath);
 
					if (page.containingPathNodes.length > 1) {
                        if (page.containingPathIndex < (page.containingPathNodes.length - 1)) {

                            // This option is on the current path or we don't know what path we're on
                            if ((foundQueryPath && (page.containingPath.slug == queryVars.path)) || !foundQueryPath) {

                                var continueVerbage;
                                if (pathOptionCount == 0) {
                                    continueVerbage = "Continue to ";
                                } else {
                                    continueVerbage = "Or, continue to "
                                }

                                // continue button
                                links = $('<p></p>');
                                var continue_button = $('<a class="continue_btn nav_btn" href="' + page.containingPathNodes[page.containingPathIndex + 1].url +
                                    '?path=' + page.containingPath.slug + '">' + continueVerbage + '&ldquo;' + page.containingPathNodes[page.containingPathIndex + 1].getDisplayTitle() +
                                    '&rdquo;</a>').appendTo(links);
                                if (pathOptionCount == 0) {
                                    continue_button.addClass('primary');
                                }
                          		var nextNodeOnPath = page.containingPathNodes[page.containingPathIndex + 1];
                          		page.addPathButton('right', nextNodeOnPath, page.containingPath);
 
                                // back button
                                if (page.containingPathIndex > 0) {
                                    var back_button = $('<a id="back-btn" class="nav_btn bordered" href="' + page.containingPathNodes[page.containingPathIndex - 1].url + '?path=' + page.containingPath.slug + '">&laquo;</a> ').prependTo(links);
                                }

                                section.append(links);
                            }
                            pathOptionCount++;
                            containingPathOptionCount++;

                        } else if (page.containingPathIndex == (page.containingPathNodes.length - 1)) {
                            section.append('<p><a id="back-btn" class="nav_btn" href="' + page.containingPathNodes[page.containingPathIndex - 1].url + '?path=' + page.containingPath.slug + '">&laquo; Back to &ldquo;' + page.containingPathNodes[page.containingPathIndex - 1].getDisplayTitle() + '&rdquo;</a></p>');
                        }
                        if (page.containingPathIndex > 0) {
                        	var prevNodeOnPath = page.containingPathNodes[page.containingPathIndex - 1];
                        	page.addPathButton('left', prevNodeOnPath, page.containingPath);
                        }
                    }
                    if (section.children().length > 0) {
                        $('#footer').before(section);
                    }
                }

                // end-of-path continue button
                if (options.showLateralNav) {
                    $('[rel="scalar:continue_to"]').each(function() {
                        var href = $(this).attr('href');
                        var span = $('header > [resource="' + href + '"]');
                        span.hide();
                        link = span.find('span[property="dcterms:title"] > a');
                        node = scalarapi.getNode(link.attr('href'));
                        if ((page.containingPathNodes.length > 0) && (page.containingPathNodes.indexOf(currentNode) == (page.containingPathNodes.length - 1))) {
                            section = $('<section class="relationships"></section');
                            $("#footer").before(section);
                            links = $('<p></p>');

                            var continuePhrase = "Continue to";
                            // if the "continue to" node is also the path we're on, then say "return" instead of "continue'"
                            if (foundQueryPath && (page.containingPath.slug == queryVars.path) && (page.containingPath == node)) {
                                continuePhrase = "Return to";
                            }

                            var end_button = $('<a class="nav_btn" href="' + node.url + '">End of path &ldquo;' + page.containingPath.getDisplayTitle() + '&rdquo;; <br /> ' + continuePhrase + ' &ldquo;' + node.getDisplayTitle() + '&rdquo;</a>').appendTo(links);
                            if (pathOptionCount == 0) {
                                end_button.addClass('primary');
                            }

                            // back button
                            var back_button = null;

                            if (page.containingPathIndex > 0) {
                                $('#back-btn').parents('section').remove(); // remove the intra-path back button and its enclosing section
                                back_button = $('<a id="back-btn" class="nav_btn" href="' + page.containingPathNodes[page.containingPathIndex - 1].url + '?path=' + page.containingPath.slug + '">&laquo;</a> ').prependTo(links);
                            }
                            section.append(links);

                            if (back_button != null) {
                                back_button.height(end_button.innerHeight()).css({ 'line-height': end_button.height() + 'px', float: 'left' });
                                $(window).resize(function() {
                                    var end_button = $('#back-btn').siblings('.nav_btn').first();
                                    $('#back-btn').height(end_button.innerHeight()).css({ 'line-height': end_button.height() + 'px' });
                                });
                            }

                            pathOptionCount++;
                            containingPathOptionCount++;
                        }
                    });
                } else {
                    // hide continue_to metadata
                    $('[rel="scalar:continue_to"]').each(function() {
                        var href = $(this).attr('href');
                        $('span[resource="' + href + '"]').hide();
                    });
                }

                // if relationship nav isn't centered, add bootstrap column formatting to help
                // accommodate long labels that wrap to multiple lines (if it is centered, then
                // we likely aren't showing lateral relationship nav anyway so don't worry about it)
                if (!options.isCentered) {
                    var cont_btn = $('.nav_btn.primary');
                    var back_btn = cont_btn.parent().children('#back-btn');
                    if (cont_btn.length !== 0) {
                        if (back_btn.length !== 0) {
                            cont_btn.parent().addClass('container');
                            back_btn.wrap('<div style="padding:0;width:initial;text-align:center" class="col-md-1 col-xs-1"></div>');
                            cont_btn.wrap('<div style="padding:0;" class="col-md-5 col-xs-9"></div>');

                            var temp = (back_btn.parent().parent().height() - back_btn.height()) / 2;
                            back_btn.css('padding-top', temp);
                            back_btn.css('padding-bottom', temp);
                            back_btn.css('vertical-align', 'top');
                        }
                    }
                    //Fix back button height on resize
                    $(window).resize(function() {
                        var back_btn = $('#back-btn');
                        if (back_btn.length > 0) {
                            var cont_btn = back_btn.parent().parent().find('.nav_btn.primary');
                            if (cont_btn.length > 0) {
                                back_btn.css('padding-top', 0);
                                back_btn.css('padding-bottom', 0);
                                var temp = (back_btn.parent().parent().height() - back_btn.height()) / 2;
                                back_btn.css('padding-top', temp);
                                back_btn.css('padding-bottom', temp);
                            }
                        }
                    });
                }

                // tag contents
                if (options.showTags) {
                    $('.tag_of').each(function() {
                        if ($(this).parent().is('section')) {
                            section = $(this).parent();
                            section.addClass('relationships');
                            section.find('h1').text('This page is a tag of:');
                            section.find('ol').contents().unwrap().wrapAll('<ul class="tag_of"></ul>');
                            section.show();

                            // hide contents if requested
                            if (!options.showLists) {
                                section.find('h1').hide();
                                section.find('ul').hide();
                            }

                            // "visit random" button
                            if ((pathOptionCount == 0) && options.showChildNav) {
                                nodes = currentNode.getRelatedNodes('tag', 'outgoing');
                                if (nodes.length > 1) {
                                    section.append('<p><a class="nav_btn" href="' + nodes[Math.floor(Math.random() * nodes.length)].url + '?tag=' + currentNode.slug + '">Visit a random tagged page</a></p>');
                                }
                            }
                        }
                    });
                }

                // comments on
                if (options.showComments) {
                    $('.reply_of').each(function() {
                        if ($(this).parent().is('section')) {
                            section = $(this).parent();
                            section.addClass('relationships');
                            section.find('h1').text('This ' + selfType + ' comments on:');
                            section.find('ol').contents().unwrap().wrapAll('<ul class="reply_of"></ul>');
                            section.show();
                        }
                    });
                }

                // annotates
                if (options.showAnno) {
                    $('.annotation_of').each(function() {
                        if ($(this).parent().is('section')) {
                            section = $(this).parent();
                            section.addClass('relationships');
                            if (currentNode.baseType == 'http://scalar.usc.edu/2012/01/scalar-ns#Composite') {
                                section.find('h1').text('This page annotates:');
                            } else if (currentNode.baseType == 'http://scalar.usc.edu/2012/01/scalar-ns#Media') {
                                section.find('h1').text('This media annotates:');
                            } else {
                                section.find('h1').text('This content annotates:');
                            }
                            section.find('ol').contents().unwrap().wrapAll('<ul class="annotation_of"></ul>');

                            // add extents to title of annotated media
                            section.find('span[property="dcterms:title"] > a').each(function() {
                                node = scalarapi.getNode($(this).attr('href'));
                                var i, relation,
                                    n = node.incomingRelations.length;
                                for (i = 0; i < n; i++) {
                                    relation = node.incomingRelations[i];
                                    if ((relation.body == currentNode) && (relation.startString != null)) {
                                        $(this).parent().append("(" + relation.startString + relation.separator + relation.endString + ") ");
                                    }
                                }
                                //age.annotatedMedia.push( node );
                            });
                            /*page.loadNextAnnotatedMedia();*/

                            section.show();
                        }
                    });
                }

                // show items that tag this page
                if (options.showParentNav) {
                    var hasTags = $(".has_tags");
                    hasTags.siblings('h1').text('This ' + selfType + ' is tagged by:');
                    $(".relationships").eq(0).before(hasTags.parent());
                    hasTags.parent().addClass('relationships').show();
                }

                // move path contents list to be the bottom-most of all relationships items
                // (or second from bottom if we have path lateral nav)
                if (pathContents != null) {
                    var relationships = $(".relationships");
                    if (relationships.length > 1) {
                        // move to second from bottom
                        if ((page.containingPaths.length > 0) && options.showLateralNav) {
                            if (!relationships.eq(relationships.length - 2).children('.path_of').length) {
                                $(".relationships").last().before(pathContents);
                            }
                            // move to bottom
                        } else {
                            if (!relationships.last().children('.path_of').length) {
                                $(".relationships").last().after(pathContents);
                            }
                        }
                    }
                }

            },

            loadNextAnnotatedMedia: function() {
                if (page.annotatedMedia.length > 0) {
                    var node = page.annotatedMedia[0];
                    scalarapi.loadPage(node.slug, true, function() {
                        var node = scalarapi.getNode(page.annotatedMedia[0].slug);
                        var element = $('section').find('a[href="' + node.url + '"]').eq(0);
                        page.annotatedMedia.splice(0, 1);
                        link = $('<a style="display: none;" href="' + node.current.sourceFile + '" resource="' + node.slug + '" data-size="full" data-relation="annotation"/></a>').appendTo(element.parent().parent().parent().parent());
                    }, null);
                }
            },

            addIncomingComments: function() {
                var currentPageNode = scalarapi.model.getCurrentPageNode();
                var comments = currentPageNode.getRelatedNodes('comment', 'incoming');
                //$('article').append('<div id="footer"><div id="comment" class="reply_link">'+((comments.length > 0) ? comments.length : '&nbsp;')+'</div><div id="footer-right"></div></div>');
                $('#footer').before('<div id="incoming_comments" class="caption_font"><div id="comment_control" class="reply_link"><strong>' + ((comments.length > 0) ? comments.length : '&nbsp;') + '</strong></div></div>');
                var commentDialogElement = $('<div></div>').appendTo('body');
                commentDialog = commentDialogElement.scalarcomments({ root_url: modules_uri + '/cantaloupe' });
                $('.reply_link').click(function() {
                    commentDialog.data('plugin_scalarcomments').showComments();
                });
                var queryVars = scalarapi.getQueryVars(document.location.href);
                if (queryVars.action == 'comment_saved') {
                    commentDialog.data('plugin_scalarcomments').showComments(true);
                }
            },

            addColophon: function() {
                var currentNode = scalarapi.model.getCurrentPageNode();
                var $footer = $('#footer');
                $footer.append('<div id="colophon" class="caption_font"><p id="scalar-credit"></p></div>');
                var $par = $footer.find('#scalar-credit');
                if (null !== currentNode.current.number) { // Make sure there is a version .. Added by Craig 6 December 2015
                    $par.append('<a href="' + scalarapi.model.urlPrefix + currentNode.slug + '.' + currentNode.current.number + '">Version ' + currentNode.current.number + '</a> of this ' + currentNode.getDominantScalarType().singular + ', updated ' + new Date(currentNode.current.created).toLocaleDateString() + ' ');
                    if ('undefined' != currentNode.paywall && 1 == parseInt(currentNode.paywall)) $par.append('&nbsp;<span class="glyphicon glyphicon-lock" aria-hidden="true" title="This page is protected by the paywall"></span> ');
                    $par.append('| <a href="' + scalarapi.model.urlPrefix + currentNode.slug + '.versions">All versions</a> | ');
                    $par.append('<a href="' + scalarapi.model.urlPrefix + currentNode.slug + '.meta">Metadata</a><br />');
                }
                $par.append('<a href="http://scalar.usc.edu/scalar"><img src="' + page.options.root_url + '/images/scalar_logo_small.png" width="18" height="16"/></a>');
                $par.append(' Powered by <a href="http://scalar.usc.edu/scalar">Scalar</a> | ');
                $par.append('<a href="http://scalar.usc.edu/terms-of-service/">Terms of Service</a> | ');
                $par.append('<a href="http://scalar.usc.edu/privacy-policy/">Privacy Policy</a> | ');
                $par.append('<a href="http://scalar.usc.edu/contact/">Scalar Feedback</a>');
            },

            addVersionInfo: function() {
                if (page.is_author || page.is_commentator || page.is_reviewer) {
                    $('#footer').append('<div id="version-info" class="caption_font"><p><a href="">Version editor</a> | <a href="">Version history</a> | <a href="">Version metadata</a></p></div>');
                }
            },

            setupScreenedBackground: function() {
                var screen = $('<div class="bg_screen"><img src="' + page.options.root_url + '/images/1x1white_trans.png" width="100%" height="100%"/></div>').prependTo('body');
                screen.css('backgroundImage', $('body').css('backgroundImage'));
                $('body').css('backgroundImage', 'none');
            },

            addNotes: function() {

                var i, n, note, resource,
                    notes = $('.note');

                n = notes.length;
                for (i = 0; i < n; i++) {
                    note = notes.eq(i);
                    resource = note.attr('resource');
                    note.wrapInner('<a href="javascript:;" rev="scalar:has_note" resource="' + resource + '"></a>');
                    note.find('a').click(function(e) {
                        e.stopPropagation();
                        page.showNote(this);
                    });
                    note.find('a').unwrap().addClass('texteo_icon texteo_icon_note');
                }

                $('body').append('<div class="note_viewer caption_font"></div>');

            },

            showNote: function(note) {
                note = $(note);
                if (note.hasClass('media_link')) {
                    $('[rev="scalar:has_note"]').removeClass('media_link');
                    $('.note_viewer').hide();
                } else {
                    var position = note.offset(),
                        noteViewer = $('.note_viewer');
                    $('[rev="scalar:has_note"]').removeClass('media_link');
                    note.addClass('media_link');
                    noteViewer.text('Loading…');
                    noteViewer.css({
                        'left': position.left,
                        'top': position.top + parseInt(note.height()) + 3
                    }).show();
                    noteViewer.data('slug', note.attr('resource'));
                    scalarapi.loadPage(note.attr('resource'), true, page.handleNoteData);
                }
            },

            hideNote: function() {
                $('[rev="scalar:has_note"]').removeClass('media_link');
                $('.note_viewer').hide();
            },

            addNoteOrAnnotationMedia: function(link, parent, maxWidth, maxHeight) {
                var options = {
                    url_attributes: ['href'],
                    autoplay: false,
                    solo: true,
                    getRelated: false,
                    size: 'full'
                };
                var slot = link.slotmanager_create_slot(maxWidth, maxHeight, options);
                if (slot) {
                    slotDOMElement = slot.data('slot');
                    slotMediaElement = slot.data('mediaelement');
                    slotDOMElement.addClass('full').appendTo(parent).css('background-image', 'none');
                    return slot;
                }
            },

            handleNoteData: function() {
                var noteViewer = $('.note_viewer');
                noteViewer.append('<br/><br/><span class="text-muted">Loading...</span>');
                var node = scalarapi.getNode(noteViewer.data('slug'));
                var height = parseInt(noteViewer.css('max-height')) - noteViewer.innerHeight() - 50;
                noteViewer.empty();
                var width = parseInt(noteViewer.css('max-width')) - noteViewer.innerWidth() - 50;
                if (node != null) {
                    if (node.current.content != null) {

                        var height = parseInt(noteViewer.css('max-height')) - noteViewer.innerHeight() - 50;

                        var temp = $('<div>' + node.current.content + '</div>').appendTo(noteViewer);

                        $(page.getMediaLinks(temp)).each(function() {
                            if ($(this).hasClass('inline')) {
                                $(this).wrap('<div></div>').hide().removeClass('inline');
                            }
                        });

                        wrapOrphanParagraphs(temp);

                        temp.children('p:not(:last-child),div:not(:last-child)').wrap('<div class="paragraph_wrapper"></div>');

                        var width = temp.width() - 50;

                        $(page.getMediaLinks(noteViewer)).each(function() {

                            $(this).attr({
                                'data-align': '',
                                'data-size': '',
                                'data-annotations': '[]',
                                'class': 'media_link'
                            });

                            var parent = $(this).parent();

                            page.addNoteOrAnnotationMedia($(this), parent, width, height);

                        });
                    } else if (node.hasScalarType('media')) {
                        var parent = $('<div class="node_media_' + node.slug + '"></div>').appendTo(noteViewer);
                        var link = $('<a href="' + node.current.sourceFile + '" data-annotations="[]" data-align="center" resource="' + node.slug + '" class="inline"></a>').hide().appendTo(parent);
                        page.addNoteOrAnnotationMedia(link, parent, width, height);
                    }
                    noteViewer.append('<br/><br/> <a class="noteLink" href="' + scalarapi.model.urlPrefix + node.slug + '">Go to note</a>');
                }
            },

            handleBook: function() {

                var viewType = 'plain';
                if ('undefined' != typeof(scalarapi.model.getCurrentPageNode().current.properties['http://scalar.usc.edu/2012/01/scalar-ns#defaultView'])) {
                    viewType = scalarapi.model.getCurrentPageNode().current.properties['http://scalar.usc.edu/2012/01/scalar-ns#defaultView'][0].value;
                }

                // add book authors if this is a book splash page
                if (viewType == 'book_splash') {

                    var i, n,
                        owners = scalarapi.model.getBookNode().properties['http://rdfs.org/sioc/ns#has_owner'],
                        authors = [];
                    if (owners) {
                        n = owners.length;
                        for (i = 0; i < n; i++) {
                            authors.push(scalarapi.getNode(scalarapi.stripAllExtensions(owners[i].value)));
                        }
                    }

                    var author,
                        n = authors.length,
                        byline = $('.title_card > h2');
                    for (var i = 0; i < n; i++) {
                        author = authors[i];
                        if (i == 0) {
                            byline.append('by ');
                        } else if (i == (n - 1)) {
                            if (n > 2) {
                                byline.append(', and ');
                            } else {
                                byline.append(' and ');
                            }
                        } else {
                            byline.append(', ');
                        }
                        byline.append(author.getDisplayTitle());
                    }

                }

                var publisherNode = scalarapi.model.getPublisherNode();
                var publisherInfo = $('<p id="publisher-credit"></p>');
                if (publisherNode != null) {
                    var publisherThumbnail = publisherNode.thumbnail;
                    if (publisherThumbnail != null) {

                        var link = $('<div>' + publisherNode.title + '</div>').find('a');
                        if (link.length) {
                            link.eq(0).html('<img src="' + publisherThumbnail + '" alt="Publisher logo"/>');
                            publisherInfo.append(link.eq(0));
                        } else {
                            publisherInfo.append('<img src="' + publisherThumbnail + '" alt="Publisher logo"/>');
                        }

                    }
                    publisherInfo.append(' ' + (publisherNode.title ? publisherNode.title : ''));
                }
                $('#colophon').before(publisherInfo);

            },

            embedMediaToAnnotate: function(content) {
                var link = $('<a href="' + currentNode.current.sourceFile + '" resource="' + currentNode.slug + '" data-align="left" class="media-page-link" data-caption="none" data-size="large"></a>').prependTo(content);
                link.wrap('<div></div>');
                page.addMediaElementForLink(link, link.parent());
                link.css('display', 'none');
                return link;
            },

            makeRelativeLinksAbsolute: function() {
                var absoluteURLRoot = $('link#parent').attr('href');
                page.bodyContentLinks().each(function() {
                    if (page.isLinkRelative(this)) {
                        var href = $(this).attr("href");
                        if (href[0] == "#") {
                            $(this).attr("href", window.location.href + href);
                        } else {
                            $(this).attr("href", absoluteURLRoot + href);
                        }
                    }
                });
            },

            bodyContent: function() {
                return $('article > span[property="sioc:content"]');
            },

            bodyContentLinks: function() {
                return page.bodyContent().find('a');
            },

            isLinkRelative: function(link) {
                var href = $(link).attr("href");
                if (href != null) {
                    if ((href.indexOf("://") == -1) && (href.indexOf("javascript:") != 0)) {
                        return true;
                    }
                }
                return false;
            },

            getMediaLinks: function(element, includeWidgets) {

                if (typeof includeWidgets === 'undefined' || includeWidgets == null) {
                    includeWidgets = false;
                }

                mediaLinks = [];

                $(element).find('a').each(function() {

                    if ((($(this).attr('resource') != null) || // linked media
                            ($(this).find('[property="art:url"]').length > 0) || // inline media
                            (($(this).parents('.annotation_of').length > 0) && ($(this).parent('span[property="dcterms:title"]').length > 0)) || // annotated media
                            (includeWidgets && $(this).data('widget') != undefined)) //self-referential widget
                        && ($(this).attr('rev') != 'scalar:has_note') && ($(this).attr('data-relation') == null)) {
                        if ($(this).data('widget') != undefined) {
                            if (includeWidgets !== true) {
                                return;
                            } else {
                                $(this).addClass('widget_link');
                            }
                        } else {
                            if ($(this).parents('.widget_slot').length > 0) {
                                $(this).remove();
                                return;
                            }
                            $(this).addClass('media_link');
                        }
                        mediaLinks.push($(this));
                    }
                });

                return mediaLinks;
            },

            // trigger media playback when links are clicked on
            handleMediaLinkClick: function(e) {

                e.preventDefault();
                e.stopPropagation();

                var mediaelement = $(this).data('mediaelement');

                if (mediaelement != null) {
                    if (mediaelement.model.node != null) {

                        // if this is an annotation link, then seek to the annotation and play
                        // the media if it isn't already playing
                        var annotationURL = $(this).data('targetAnnotation');
                        if (annotationURL != null) {

                            mediaelement.seek(mediaelement.model.initialSeekAnnotation);
                            if ((mediaelement.model.mediaSource.contentType != 'document') && (mediaelement.model.mediaSource.contentType != 'image')) {
                                setTimeout(function() {
                                    if (!mediaelement.is_playing()) {
                                        mediaelement.play();
                                    }
                                }, 250);
                            }

                        } else if (mediaelement.is_playing()) {
                            mediaelement.pause();
                        } else {
                            mediaelement.play();
                        }

                        // pause all other media on the page
                        $('a.media_link').each(function() {
                            var me = $(this).data('mediaelement');
                            if (me != null) {
                                if (me !== mediaelement) {
                                    if (me.model.node != null) {
                                        me.pause();
                                    }
                                }
                            }
                        });
                    }
                }

                var $mediaelement = mediaelement.model.element;

                var scroll_buffer = 100;
                var scroll_time = 750;
                var $body = $('html,body');

                //scroll to media element when link is clicked
                if (!(($mediaelement.offset().top + $mediaelement.height()) <= (-$body.offset().top + $body.height()) &&
                        $mediaelement.offset().top >= (-$body.offset().top))) {
                    $body.animate({
                        scrollTop: $mediaelement.offset().top - scroll_buffer
                    }, scroll_time);
                }

                // do not provide label over media if image height is too small
                var min_height = 50;
                var mediaHeight = $mediaelement.find('.mediaObject').height();
                if (mediaHeight >= min_height) {
                    var $media_label = $mediaelement.find('.scalar-media-label');
                    if ($media_label.length == 0) {

                        var label = '<span class="scalar-media-label label label-default">' + mediaelement.model.node.current.title + '</span>'
                        $media_label = $(label).appendTo($mediaelement);

                        var font_size = parseInt($media_label.css('font-size').replace('px', ''));

                        var font_inc = 300;
                        var font_mult = 3;
                        font_size = (font_size + Math.floor($mediaelement.width() / font_inc) * font_mult) + 'px';

                        var label_style = 'white-space:normal;position:absolute;max-width:' + $mediaelement.width() + 'px;font-size:' + font_size;
                        $media_label.attr('style', label_style);
                        $media_label.css('top', ((mediaHeight - $media_label.outerHeight()) / 2));
                        $media_label.css('left', (($mediaelement.width() - $media_label.outerWidth()) / 2));
                    }
                    var label_hide_delay = 1500;
                    var label_fade_delay = 400;
                    $media_label.show().delay(label_hide_delay).fadeOut(label_fade_delay);
                }
            },

            addMediaElements: function() {

                var i, n,
                    currentNode = scalarapi.model.getCurrentPageNode(),
                    viewType = 'plain',
                    extension = scalarapi.getFileExtension(window.location.href);

                if (null != currentNode.current && 'undefined' != typeof(currentNode.current.properties['http://scalar.usc.edu/2012/01/scalar-ns#defaultView'])) {
                    viewType = currentNode.current.properties['http://scalar.usc.edu/2012/01/scalar-ns#defaultView'][0].value
                }

                page.calculatePageDimensions();

                // Using defaultView rather than <link id="view" /> means that a view can not be chosen via URL extension,
                // but rather only by setting it as the default view for the page.  Since 'annotation_editor' and 'edit' views
                // can only be called by extension, then they need to be special cased here ~Craig

                if ('annotation_editor' == extension) {

                    // is this a media page?
                    if ($('[resource="' + currentNode.url + '"][typeof="scalar:Media"]').length > 0) {

                        var link,
                            content = page.bodyContent(),
                            approot = $('link#approot').attr('href');

                        // has the annobuilder already been set up? if not, then do so
                        if ($('link[href="' + approot + 'views/widgets/annobuilder/annobuilder.css"]').length == 0) {
                            $.getScript(approot + 'views/melons/cantaloupe/js/bootbox.min.js'); // Assume that Bootstrap is installed (otherwise jQuery UI is needed)
                            $('head').append('<link rel="stylesheet" type="text/css" href="' + approot + 'views/widgets/edit/content_selector.css">');
                            $.getScript(approot + 'views/widgets/edit/jquery.content_selector.js');
                            $('head').append('<link rel="stylesheet" type="text/css" href="' + approot + 'views/widgets/annobuilder/jquery.bootstrap-touchspin.css">');
                            $.getScript(approot + 'views/widgets/annobuilder/jquery.bootstrap-touchspin.js');
                            $('head').append('<link rel="stylesheet" type="text/css" href="' + approot + 'views/widgets/annobuilder/annobuilder.css">');
                            $.getScript(approot + 'views/widgets/annobuilder/jquery.annobuilder.js', function() {
                                content.prepend('<br clear="both" />');
                                link = page.embedMediaToAnnotate(content);
                                $('.annobuilder:first').annobuilder({ link: link });
                            });
                            // if the annobuilder has been set up, then just re-embed the media
                        } else {
                            page.embedMediaToAnnotate(content);
                        }

                        // not a media page
                    } else {
                        page.bodyContent().append('<div class="body_copy"><p class="text-danger">The annotation editor could not be loaded because this is not a media page.</p></div>');
                    }

                } else if ('edit' == extension) {
                    // Nothing needed here

                } else if ('meta' == extension) {
                    // if this is a media page, embed the media at native size
                    if ($('[resource="' + currentNode.url + '"][typeof="scalar:Media"]').length > 0) {
                        var currentNode = scalarapi.model.getCurrentPageNode();
                        var link = $('<a href="' + currentNode.current.sourceFile + '" resource="' + currentNode.slug + '" data-align="left" class="media-page-link" data-size="native"></a>').insertBefore(page.bodyContent());

                        link.wrap('<div></div>');
                        page.addMediaElementForLink(link, link.parent());
                        link.css('display', 'none');
                        $('.meta-header').remove();
                    };

                } else if ('' == extension) {

                    anno.addHandler('onPopupShown', function(annotation) {
                        var height = null;
                        $('.annotorious-popup').each(function() {
                            var width = $(this).width();
                            if (annotation.isMedia) {
                                var parent = $(this).find('.annotorious-popup-text');
                                var node = scalarapi.getNode(parent.find('a').first().attr('href'));
                                var link = $('<a href="' + node.current.sourceFile + '" data-annotations="[]" data-align="center" resource="' + node.slug + '" class="inline"></a>').hide().appendTo(parent);
                                page.addNoteOrAnnotationMedia(link, parent, width, height);
                            } else {
                                $(page.getMediaLinks($(this))).each(function() {
                                    if ($(this).hasClass('inline')) {
                                        $(this).wrap('<div></div>').hide().removeClass('inline');
                                    }
                                });

                                wrapOrphanParagraphs($(this));

                                $(this).children('p:not(:last-child),div:not(:last-child)').wrap('<div class="paragraph_wrapper"></div>');

                                $(page.getMediaLinks($(this))).each(function() {
                                    $(this).attr({
                                        'data-align': '',
                                        'data-size': '',
                                        'data-annotations': '[]',
                                        'class': 'media_link'
                                    });
                                    var parent = $(this).parent();
                                    page.addNoteOrAnnotationMedia($(this), parent, width, height);
                                });
                            }
                        });
                    });

                    switch (viewType) {

                        case 'gallery':
                            var node, link, mediaContainer, item, indicator, description, galleryHeight, mediaelement,
                                nodes = [];

                            // get all of the media links in the page content
                            var mediaLinks = page.getMediaLinks(page.bodyContent());
                            $(mediaLinks).each(function() {
                                node = scalarapi.getNode($(this).attr('resource'));
                                if (node != null) {
                                    nodes.push(node);
                                }
                            });

                            nodes = nodes.concat(getChildrenOfType(currentNode, 'media'));

                            if (page.adaptiveMedia == "mobile") {
                                galleryHeight = 300;
                            } else {
                                // this magic number matches a similar one in the calculateContainerSize method of jquery.mediaelement.js;
                                // keeping them synced up helps keep media vertically aligned in galleries
                                galleryHeight = window.innerHeight - 250;
                            }

                            $('article > header').after('<div id="gallery" class="carousel slide"></div>');
                            page.mediaCarousel = $('#gallery');
                            var wrapper = $('<div class="carousel-inner" role="listbox"></div>').appendTo(page.mediaCarousel);

                            n = nodes.length;
                            for (var i = 0; i < n; i++) {

                                node = nodes[i];
                                item = $('<div class="item" style="height: ' + galleryHeight + 'px;"></div>').appendTo(wrapper);
                                if (i == 0) {
                                    item.addClass("active");
                                }

                                // if this is a media link that's already part of the content of the page, then use it
                                if (i < mediaLinks.length) {
                                    mediaContainer = $('<span></span>').appendTo(item);
                                    link = mediaLinks[i];
                                    if (link.hasClass('inline')) {
                                        link.removeClass('inline');
                                        link.css('display', 'none');
                                    }
                                    link.attr({
                                        'data-size': 'full',
                                        'data-caption': 'none'
                                    });

                                    // otherwise, create a new link from scratch
                                } else {
                                    mediaContainer = $('<span><a href="' + node.current.sourceFile + '" resource="' + node.slug + '" data-size="full" data-caption="none">' + node.slug + '</a></span>').appendTo(item);
                                    link = mediaContainer.find('a');
                                    link.css('display', 'none');
                                }

                                if (node.current.description != null) {
                                    description = node.current.description;
                                    if (node.current.source != null) {
                                        description += ' (Source: ' + node.current.source + ')';
                                    }
                                    description = description.replace(new RegExp("\"", "g"), '&quot;');
                                    item.append('<div class="carousel-caption caption_font"><span>' +
                                        '<a href="' + node.url + '" role="button" data-toggle="popover" data-placement="bottom" data-trigger="hover" data-title="' + node.getDisplayTitle().replace('"', '&quot;') + '" data-content="' + description + '">' + node.getDisplayTitle() + '</a> (' + (i + 1) + '/' + n + ')' +
                                        '</span></div>');
                                } else {
                                    item.append('<div class="carousel-caption caption_font"><span>' +
                                        '<a href="' + node.url + '" >' + node.getDisplayTitle() + '</a> (' + (i + 1) + '/' + n + ')' +
                                        '</span></div>');
                                }

                                page.addMediaElementForLink(link, mediaContainer, galleryHeight);

                            }
                            if (page.adaptiveMedia != "mobile") {
                                wrapper.find('[data-toggle="popover"]').popover({
                                    container: '#gallery',
                                    template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title heading_font heading_weight"></h3><div class="popover-content caption_font"></div></div>'
                                });
                            }
                            page.mediaCarousel.find('.mediaelement').css('z-index', 'inherit');
                            page.mediaCarousel.find('.slot').css('margin-top', '0');
                            page.mediaCarousel.append('<a class="left carousel-control" href="#gallery" role="button" data-slide="prev">' +
                                '<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>' +
                                '<span class="sr-only">Previous</span>' +
                                '</a>' +
                                '<a class="right carousel-control" href="#gallery" role="button" data-slide="next">' +
                                '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>' +
                                '<span class="sr-only">Next</span>' +
                                '</a>');
                            page.mediaCarousel.carousel({ interval: false });
                            $(mediaLinks).each(function(i) {
                                $(this).data('index', i);
                                $(this).click(function(e) {
                                    e.preventDefault();
                                    page.mediaCarousel.carousel($(this).data('index'));
                                });
                                $(this).click(page.handleMediaLinkClick);
                            });

                            if (isMobile) {
                                if (touchLoaded) {
                                    page.mediaCarousel.swiperight(function() {
                                        $(this).carousel('prev');
                                    }).swipeleft(function() {
                                        $(this).carousel('next');
                                    });
                                } else {
                                    $.getScript(views_uri + '/melons/cantaloupe/js/jquery.mobile.touch.min.js', function() {
                                        touchLoaded = true;
                                        page.mediaCarousel.swiperight(function() {
                                            $(this).carousel('prev');
                                        }).swipeleft(function() {
                                            $(this).carousel('next');
                                        });
                                    });
                                }
                            }

                            break;

                        case "splash":
                        case "book_splash":
                        case "versions":
                        case "history":
                            // these views don't get media
                            break;

                        case "meta":
                            if ($('[resource="' + currentNode.url + '"][typeof="scalar:Media"]').length > 0) {
                                var currentNode = scalarapi.model.getCurrentPageNode();
                                var link = $('<a href="' + currentNode.current.sourceFile + '" resource="' + currentNode.slug + '" data-align="left" class="media-page-link" data-size="native"></a>').insertBefore(page.bodyContent());

                                link.wrap('<div></div>');
                                page.addMediaElementForLink(link, link.parent());
                                link.css('display', 'none');
                                $('.meta-header').remove();
                            };
                            break;

                        default:
                            if (viewType == 'structured_gallery') {
                                page.structuredGallery.addMedia();
                            }
                            var mediaLinks = page.getMediaLinks($('article > span[property="sioc:content"],.relationships > .annotation_of'), true);

                            $(mediaLinks).each(function() {
                                if ($(this).parents('widget_carousel').length > 0) {
                                    return;
                                }
                                if ($(this).hasClass('widget_link')) {
                                    if ($(this).data('slot') !== undefined) {
                                        $(this).data('slot').remove();
                                    }
                                    widgets.handleWidget($(this));
                                } else {
                                    if ((($(this).attr('resource') != null) || // linked media
                                            ($(this).find('[property="art:url"]').length > 0) || // inline media
                                            (($(this).parents('.annotation_of').length > 0) && ($(this).parent('span[property="dcterms:title"]').length > 0))) // annotated media
                                        && ($(this).attr('rev') != 'scalar:has_note') && ($(this).attr('data-relation') == null)) {

                                        var slot, slotDOMElement, slotMediaElement, count, parent;

                                        if ($(this).attr('resource') == undefined) {

                                            // inline media (first time)
                                            if ($(this).attr('href') == undefined) {
                                                $(this).attr('href', currentNode.current.sourceFile);
                                                $(this).attr('resource', currentNode.slug);
                                                $(this).attr('data-size', 'full');
                                                parent = $(this);

                                                // inline media (subsequent, after page resize)
                                            } else if ($(this).attr('href') == currentNode.current.sourceFile) {
                                                parent = $(this);

                                                // annotated media link (as appears on an annotation page)
                                            } else {
                                                var annotatedMedia = currentNode.getRelatedNodes("annotation", "outgoing");
                                                var i, node, annotationURL,
                                                    n = annotatedMedia.length;
                                                for (i = 0; i < n; i++) {
                                                    node = annotatedMedia[i];
                                                    annotationURL = node.current.sourceFile + "#" + currentNode.slug;

                                                    // process the link for the first time
                                                    if (node.url == $(this).attr('href')) {
                                                        $(this).attr('href', node.current.sourceFile + "#" + currentNode.slug);
                                                        $(this).attr('resource', node.slug);
                                                        $(this).attr('data-size', 'full');
                                                        parent = $(this).closest('section');
                                                        break;

                                                        // if the link has already been processed, then we just need its parent
                                                        // (for example if the user just resized the page)
                                                    } else if ($(this).attr('href') == annotationURL) {
                                                        parent = $(this).closest('section');
                                                        break;
                                                    }
                                                }
                                            }
                                            $(this).addClass("resource-added");

                                            // standard media link
                                        } else {
                                            parent = $(this).closest('.body_copy');

                                            // if the link is not a descendant of a body_copy region, then we'll put the media either
                                            // before or after the link itself
                                            if (parent.length == 0) {
                                                parent = $(this);
                                            }
                                        }

                                        // cause any paragraph with a media link to clear both (unless it contains a .clearnone)
                                        if ($(this).parents('.paragraph_wrapper').find('.clearnone').length == 0) {
                                            $(this).parents('.paragraph_wrapper').addClass('clearboth');
                                        }

                                        page.addMediaElementForLink($(this), parent);

                                        $(this).click(page.handleMediaLinkClick);

                                    }
                                }
                            });

                            // if this is a media page, embed the media at native size
                            if ($('[resource="' + currentNode.url + '"][typeof="scalar:Media"]').length > 0) {
                                var link = $('<a href="' + currentNode.current.sourceFile + '" resource="' + currentNode.slug + '" data-align="left" class="media-page-link" data-size="native"></a>').appendTo(page.bodyContent());
                                link.wrap('<div></div>');
                                page.addMediaElementForLink(link, link.parent());
                                link.css('display', 'none');
                            };

                            $('[data-relation="annotation"]').each(function() {
                                page.addMediaElementForLink($(this), $(this).parent().parent());
                                //$(this).css('display', 'none');
                            });

                            page.mediaDetails = $.scalarmediadetails($('<div></div>').appendTo('body'));

                            /*$('.annotation_of').each( function() {
                            	node = scalarapi.getNode( $( this ).attr( 'href' ) );
                            	if ( node != null ) {
                            		page.addMediaElementForLink( $( this ), $( this ).parent() );
                            		//$( this ).css('display', 'none');
                            	}
                            } );*/

                            break;

                    }

                } //if(extension)

            },

            addMediaElementsForElement: function(element) {
                page.calculatePageDimensions();

                element.find('a').each(function() {

                    // resource property signifies a media link
                    if (($(this).attr('resource') || ($(this).find('[property="art:url"]').length > 0)) && ($(this).attr('rev') != 'scalar:has_note') && ($(this).attr('data-relation') == null)) {

                        var slot, slotDOMElement, slotMediaElement, count, parent,
                            currentNode = scalarapi.model.getCurrentPageNode();

                        if ($(this).attr('resource') == undefined) {
                            $(this).attr('href', currentNode.current.sourceFile);
                            $(this).attr('resource', currentNode.slug);
                            $(this).attr('data-size', 'full');
                            parent = $(this);
                        } else {
                            parent = $(this).parent('p,div');
                        }

                        $(this).addClass('media_link');

                        page.addMediaElementForLink($(this), parent);

                    }
                });
                element.find('[data-relation="annotation"]').each(function() {
                    page.addMediaElementForLink($(this), $(this).parent().parent());
                });
            },

            updateMediaHeightRestrictions: function() {
                typeLimits = {
                    // Add more exceptions to height limitations if needed

                    // Images can be larger than the window, but still give them a limit so that very long narrow images don't span too long
                    'image': $(window).height() * 1.3,
                    // The default for media should be to limit their size to fit within the bounds of the window
                    'default': $(window).height() * 0.75,
                };
            },

            handleDelayedResize: function() {
                if ((page.initialMediaLoad === true) && !page.isFullScreen && (document.location.href.indexOf('.annotation_editor') == -1)) {
                    var reload = false;
                    page.orientation = window.orientation;
                    if ($('body').width() <= page.mobileWidth) {
                        if (page.adaptiveMedia != 'mobile') {
                            page.adaptiveMedia = 'mobile';
                            reload = true;
                        }
                    } else if (page.adaptiveMedia != 'full') {
                        page.adaptiveMedia = 'full';
                        reload = true;
                    }
                    var newSize = { x: $(window).width(), y: $(window).height() };
                    if ((Math.abs(page.sizeOnMediaLoad.x - newSize.x) > 100) || (Math.abs(page.sizeOnMediaLoad.y - newSize.y) > 100)) {
                        page.sizeOnMediaLoad = newSize;
                        reload = true;
                    }
                    if (reload) {
                        page.handleMediaResize();
                    }
                }
            },

            handleMediaResize: function() {

                page.updateMediaHeightRestrictions();

                // Regenerate media details view if currently open
                if ($('.media_details:visible').length == 1) {
                    $('.media_details:visible').find('[title="Close"]').click();
                    setTimeout(page.mediaDetails.show, 1000);
                }
                // remove elements that were added the last time
                // the page was parsed for media to show
                $('.slot').remove();
                $('.mediainfo').remove();
                $('.media-page-link').remove();

                page.clearIncrementedData();

                $('a.media_link').each(function() {
                    $(this).removeData("mediaelement");
                    $(this).off();
                    if ($(this).hasClass("resource-added")) {
                        $(this).removeAttr("resource");
                    }
                });

                if (page.structuredGallery != null) {
                    page.structuredGallery.addMedia();
                }

                if (page.mediaCarousel != null) {
                    page.mediaCarousel.remove();
                }

                page.addMediaElements();

            },

            addAdditionalMetadata: function() {

                var prop, value,
                    count = 0,
                    table = $('<table></table>'),
                    currentNode = scalarapi.model.getCurrentPageNode();

                // build table of auxiliary properties (and count how many there are)
                for (prop in currentNode.current.auxProperties) {
                    for (i in currentNode.current.auxProperties[prop]) {
                        value = currentNode.current.auxProperties[prop][i];
                        if (-1 != value.indexOf('://')) value = '<a href="' + value + '">' + value + '</a>';
                        table.append('<tr><td>' + prop + '</td><td>' + value + '</td></tr>');
                        count++;
                    }
                }

                // if we have auxiliary properties, add a button to toggle their display
                if (count > 0) {

                    var metadata = $('<div class="body_copy additional_metadata caption_font" style="clear: both;"></div>');
                    var button = $('<a class="btn btn-default" aria-expanded="false" aria-controls="additionalMetadata">Additional metadata</a>').appendTo(metadata);
                    button.click(function() {
                        var isExpanded = $(this).attr("aria-expanded");
                        if (isExpanded == "false") {
                            $("#additionalMetadata").show();
                            $(this).attr("aria-expanded", "true");
                        } else {
                            $("#additionalMetadata").hide();
                            $(this).attr("aria-expanded", "false");
                        }
                    });
                    var collapsible = $('<div id="additionalMetadata"><div class="well"></div></div>').appendTo(metadata);
                    var well = collapsible.find(".well");
                    well.append(table);

                    page.bodyContent().append(metadata);
                    metadata.wrap('<div class="paragraph_wrapper"></div>');

                }

            },

            addExternalLinks: function() {
                page.bodyContentLinks().each(function() {

                    var base_url = $('link#parent').attr('href');
                    var $link = $(this);
                    var resource = $link.attr('resource');
                    var href = $link.attr('href');
                    var target = ('undefined' != typeof($link.attr('target'))) ? $link.attr('target') : null;
                    var url = $(this).attr("href");

                    // Link without resource=""	(external or internal)
                    if (resource == null) {
                        if ('undefined' != typeof(href) && base_url) {
                            if (href.substr(0, 4) == 'http' && href.indexOf(base_url) == -1) { // External link
                                $link.click(function() { // Open with previous header
                                    if (target) { // E.g., open in a new page
                                        $link.click();
                                        return false;
                                    } else {
                                        var link_to = base_url + 'external?link=' + encodeURIComponent($(this).attr('href')) + '&prev=' + encodeURIComponent(document.location.href);
                                        document.location.href = link_to;
                                        return false;
                                    }
                                });
                            }
                        }
                    }
                });
            },

            addMarkerFromLatLonStrToMap: function(latlngstr, title, desc, link, map, infoWindow, thumbnail, label, mapElement, markers) {
                if ((typeof mapElement == "undefined" || mapElement == null || !mapElement) && typeof $gmaps != "undefined") {
                    mapElement = $gmaps;
                }
                if ((typeof markers == "undefined" || markers == null || !markers) && typeof page.mapMarkers != "undefined") {
                    markers = page.mapMarkers;
                }

                var marker, contentString,
                    temp = latlngstr.split(',');

                // error checking
                if ((temp.length != 2) || ((isNaN(parseFloat(temp[0])) || isNaN(parseFloat(temp[1]))))) {
                    return false;

                } else {
                    var latlng = new google.maps.LatLng(parseFloat(temp[0]), parseFloat(temp[1]));

                    map.setCenter(latlng);

                    var titleMarkup;
                    if (link != null) {
                        titleMarkup = '<h2 class="heading_font heading_weight"><a href="' + link + '">' + title + '</a></h2>';
                    } else {
                        titleMarkup = '<h2 class="heading_font heading_weight">' + title + '</h2>';
                    }

                    var thumbnailMarkup = "";
                    if (thumbnail != null) {
                        var url = thumbnail;
                        if (thumbnail.indexOf('://') == -1) {
                            url = scalarapi.model.urlPrefix + thumbnail;
                        }
                        thumbnailMarkup = '<img style="float:right; margin: 0 0 1rem 1rem;" src="' + url + '" alt="Thumbnail image" width="120"/>';
                    }

                    // add marker and info window for current page
                    if (desc != null) {
                        contentString = '<div class="google-info-window caption_font">' + titleMarkup + '<div>' + thumbnailMarkup + desc + '</div>';
                    } else {
                        contentString = '<div class="google-info-window caption_font">' + titleMarkup + '<div>' + thumbnailMarkup + '</div>';
                    }
                    page.generateIcon(label, function(src) {
                        marker = new google.maps.Marker({
                            position: latlng,
                            map: map,
                            html: contentString,
                            title: title,
                            icon: src
                        });
                        google.maps.event.addListener(marker, 'click', function() {
                            infoWindow.setContent(this.html);
                            infoWindow.open(map, this);
                        });
                        markers.push(marker);
                        var bounds = new google.maps.LatLngBounds();
                        mapElement.data({ 'map': map, 'bounds': bounds, 'markers': markers });
                        $(markers).each(function() {
                            bounds.extend(this.position);
                        });
                        if (markers.length > 1) {
                            map.fitBounds(bounds);
                        }

                    })
                }
                return markers;
            },

            // dynamically generate map marker that increases in size to accomodate multi-digit numbers
            // adapted from: http://stackoverflow.com/questions/2436484/how-can-i-create-numbered-map-markers-in-google-maps-v3
            generateIcon: function(number, callback) {

                if (page.generateIconCache[number] !== undefined) {
                    callback(page.generateIconCache[number]);
                }

                var fontSize = 16,
                    imageWidth = imageHeight = 45;

                if (number >= 1000) {
                    fontSize = 11;
                    imageWidth = imageHeight = 60;
                } else if (number > 100) {
                    fontSize = 14;
                    imageWidth = imageHeight = 50;
                }

                var svg = d3.select(document.createElement('div')).append('svg')
                    .attr('width', '60')
                    .attr('height', '60')
                    .attr('viewBox', '0 0 60 60');

                var gradient = svg.append("defs")
                    .append("linearGradient")
                    .attr("id", "grad")
                    .attr("x1", "0%")
                    .attr("y1", "0%")
                    .attr("x2", "0%")
                    .attr("y2", "100%");

                gradient.append("stop")
                    .attr("offset", "0%")
                    .attr("stop-color", "rgb(248,113,100)")
                    .attr("stop-opacity", 1);

                gradient.append("stop")
                    .attr("offset", "100%")
                    .attr("stop-color", "rgb(240,72,60)")
                    .attr("stop-opacity", 1);

                var g = svg.append('g')

                var path = g.append('path')
                    .attr('transform', 'matrix(0.03,0,0,0.03,5,6)')
                    .attr('d', 'M730.94,1839.63C692.174,1649.33 623.824,1490.96 541.037,1344.19C479.63,1235.32 408.493,1134.83 342.673,1029.25C320.701,994.007 301.739,956.774 280.626,920.197C238.41,847.06 204.182,762.262 206.357,652.265C208.482,544.792 239.565,458.581 284.387,388.093C358.106,272.158 481.588,177.104 647.271,152.124C782.737,131.7 909.746,166.206 999.814,218.872C1073.41,261.91 1130.41,319.399 1173.73,387.152C1218.95,457.868 1250.09,541.412 1252.7,650.384C1254.04,706.214 1244.9,757.916 1232.02,800.802C1218.99,844.211 1198.03,880.497 1179.38,919.256C1142.97,994.915 1097.33,1064.24 1051.52,1133.6C915.083,1340.21 787.024,1550.91 730.94,1839.63L730.94,1839.63Z')
                    .attr('fill', 'url(#grad)')
                    .attr('stroke-width', 40)
                    .attr('stroke', 'rgb(182,58,49)');

                if (number != null) {
                    var text = g.append('text')
                        .attr('dx', 27)
                        .attr('dy', 32)
                        .attr('text-anchor', 'middle')
                        .attr('style', 'font-size:' + fontSize + 'px; fill: #000; font-family: Lato, Arial, sans-serif; font-weight: bold')
                        .text(number);
                } else {
                    var circles = svg.append('circle')
                        .attr('cx', '27.2')
                        .attr('cy', '27.2')
                        .attr('r', '5')
                        .style('fill', 'rgb(90,20,16)');
                }

                var svgNode = g.node().parentNode.cloneNode(true),
                    image = new Image();

                d3.select(svgNode).select('clippath').remove();

                var xmlSource = (new XMLSerializer()).serializeToString(svgNode);

                image.onload = (function(imageWidth, imageHeight) {
                    var canvas = document.createElement('canvas'),
                        context = canvas.getContext('2d'),
                        dataURL;

                    d3.select(canvas)
                        .attr('width', imageWidth)
                        .attr('height', imageHeight);

                    context.drawImage(image, 0, 0, imageWidth, imageHeight);

                    dataURL = canvas.toDataURL();
                    page.generateIconCache[number] = dataURL;

                    callback(dataURL);
                }).bind(this, imageWidth, imageHeight);

                image.src = 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(xmlSource).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                    return String.fromCharCode('0x' + p1);
                }));
            },

            sortTags: function() {
                $('.tag_of').each(function() {
                    var section = $(this).parent();
                    page.alphabetizeRelationshipListItems(section.find('ol'), 'a[rel="oac:hasTarget"]');
                });
                $('.has_tags').each(function() {
                    page.alphabetizeRelationshipListItems($(this), 'a[rel="oac:hasBody"]');
                });
            },

            alphabetizeRelationshipListItems: function(list, scalarVersionUrlSelector) {
                var listItems = list.children('li');
                listItems.sort(function(a, b) {
                    var versionUrl = $(a).find(scalarVersionUrlSelector).attr('href');
                    var nodeA = scalarapi.getNode(scalarapi.stripVersion(versionUrl));
                    versionUrl = $(b).find(scalarVersionUrlSelector).attr('href');
                    var nodeB = scalarapi.getNode(scalarapi.stripVersion(versionUrl));
                    if ((nodeA != null) && (nodeB != null)) {
                        var nameA = nodeA.getSortTitle().toLowerCase();
                        var nameB = nodeB.getSortTitle().toLowerCase();
                        if ('undefined' == typeof(nameA)) nameA = scalarapi.untitledNodeString;
                        if ('undefined' == typeof(nameB)) nameB = scalarapi.untitledNodeString;
                        if (nameA < nameB) return -1;
                        if (nameA > nameB) return 1;
                    }
                    return 0;
                });
                listItems.detach().appendTo(list);
            }

        };

        page.updateMediaHeightRestrictions();
        page.sortTags();

        $('body').bind('setState', page.handleSetState);
        $('body').bind('mediaElementMediaLoaded', page.handleMediaElementMetadata);

        $(document).bind("mozfullscreenchange webkitfullscreenchange msfullscreenchange webkitbeginfullscreen webkitendfullscreen", function(e) {

            var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
            page.isFullScreen = (fullscreenElement != null);

            if (page.isFullScreen) {
                page.lastOrientation = ((Math.abs(window.orientation) === 90) ? "landscape" : "portrait");

            } else {
                // if orientation changed while we were full screen, then check to see if media needs to be reformatted
                var currentOrientation = ((Math.abs(window.orientation) === 90) ? "landscape" : "portrait");
                if (page.lastOrientation != currentOrientation) {
                    page.handleDelayedResize();
                }
            }
        });

        element.addClass('page');

        $('header').show();
        $('#book-id').hide();
        $('[property="scalar:fullname"]').hide();
        $('[property="dcterms:description"]').hide();

        //Are we logged in? Check the RDF metadata.
        page.logged_in = $('link#logged_in').length > 0 && $('link#logged_in').attr('href') != '';
        if (page.logged_in) {
            //While we are logged in, check what our user level is, and set the appropriate bools
            page.is_author = $('link#user_level').length > 0 && $('link#user_level').attr('href') == 'scalar:Author';
            page.is_commentator = $('link#user_level').length > 0 && $('link#user_level').attr('href') == 'scalar:Commentator';
            page.is_reviewer = $('link#user_level').length > 0 && $('link#user_level').attr('href') == 'scalar:Reviewer';
        }

        $('section').hide(); // TODO: Make this more targeted

        $('article').append('<div id="footer" class="caption_font"></div>');

        $('body').bind('delayedResize', page.handleDelayedResize);

        if ($('body').width() <= page.mobileWidth) {
            page.adaptiveMedia = 'mobile';
        }

        $('body').on('mediaElementMediaLoaded widgetElementLoaded', function() {
            page.initialMediaLoad = true;
            page.sizeOnMediaLoad = { x: $(window).width(), y: $(window).height() };
        });

        var i, node, nodes, link, visOptions, visualization,
            currentNode = scalarapi.model.getCurrentPageNode();

        var viewType;
        var extension = scalarapi.getFileExtension(window.location.href);
        var version = scalarapi.getVersionExtension(window.location.href);

        if (currentNode != null && currentNode.current != null) {

            if ((extension == '') || (version != '')) {
                viewType = 'plain';
                if ('undefined' != typeof(currentNode.current.properties['http://scalar.usc.edu/2012/01/scalar-ns#defaultView'])) {
                    viewType = currentNode.current.properties['http://scalar.usc.edu/2012/01/scalar-ns#defaultView'][0].value;
                }
                if (version != '') {
                    $('h1[property="dcterms:title"]').append(' (Version ' + parseInt(version) + ')');
                }
            } else {
                // handle case where the extension specifies a version number to be viewed
                // in the versions view, i.e. "2.versions"
                if ((extension.indexOf("versions") != -1) && (extension != "versions")) {
                    viewType = "versions";
                } else {
                    viewType = extension;
                }
            }

            if ((viewType != 'edit') && (viewType != 'blank') && (viewType != 'meta') && (viewType != 'versions') && (viewType != 'annotation_editor')) {
                wrapOrphanParagraphs($('[property="sioc:content"]'));
                $('[property="sioc:content"]').children('p,div').not('[data-size="full"]').addClass('body_copy');
                $('[property="sioc:content"]').children('p,div').wrap('<div class="paragraph_wrapper"></div>');
            }

            // this prevents scrolling within in the WYSIWYG from locking up on Safari
            if (viewType != 'edit') {
                page.makeRelativeLinksAbsolute();
            }

            page.getContainingPathInfo();
            switch (viewType) {

                case 'splash':
                case 'book_splash':
                    $('article').before('<div class="blackout"></div>');
                    element.addClass('splash');
                    $('h1[property="dcterms:title"]').wrap('<div class="title_card"></div>');

                    // add book title and placeholder for author list
                    if (viewType == "book_splash") {
                        $('h1[property="dcterms:title"]').html($('.book-title').html());
                        $('.title_card').append('<h2></h2>');
                    }

                    var banner = currentNode.banner;
                    if ('undefined' != typeof(banner) && banner.length && -1 == banner.indexOf('//')) banner = $('link#parent').attr('href') + banner;
                    $('[property="art:url"]').hide();
                    // element.css('backgroundImage', $('body').css('backgroundImage'));
                    element.css('background-image', "url('" + banner + "')");
                    $('body').css('backgroundImage', 'none');
                    $('.paragraph_wrapper').remove();
                    page.addRelationshipNavigation({ showChildNav: true, showLateralNav: true, isCentered: true });
                    //console.log( $('.relationships') );
                    $('.relationships').appendTo('.title_card');

                    window.setTimeout(function() {
                        $('.splash').delay(1000).addClass('fade_in').queue('fx', function(next) {
                            $('.blackout').remove();
                            $('.title_card').addClass('fade_in');
                            next();
                        });
                    }, 200);
                    break;

                case 'gallery':
                    page.setupScreenedBackground();
                    page.addHeaderPathInfo();
                    page.addRelationshipNavigation({
                        showLists: true,
                        showParentNav: true,
                        showChildNav: true,
                        showLateralNav: true,
                        showAnno: true,
                        showComments: true,
                        showTags: true
                    });
                    page.addIncomingComments();
                    page.addAdditionalMetadata();
                    page.addExternalLinks();
                    page.addColophon();
                    page.addNotes();
                    break;

                case 'visualization':
                    var visOptions = {
                        modal: false,
                        content: 'all',
                        relations: 'all',
                        format: 'grid'
                    };
                    var visualization = $('<div class="visualization"></div>').appendTo(element);
                    visualization.scalarvis(visOptions);
                    break;

                case 'structured_gallery':
                    page.setupScreenedBackground();
                    var galleryElement = $('<div></div>');
                    page.bodyContent().after(galleryElement);
                    page.structuredGallery = $.scalarstructuredgallery(galleryElement);
                    page.addHeaderPathInfo();
                    page.addRelationshipNavigation({
                        showParentNav: true,
                        showLateralNav: true,
                        showAnno: true,
                        showComments: true,
                        showTags: true
                    });
                    page.addIncomingComments();
                    page.addAdditionalMetadata();
                    page.addExternalLinks();
                    page.addColophon();
                    page.addNotes();
                    break;

                case 'blank':
                    $('h1').hide();
                    $('.page').css('padding-top', '5.0rem');
                    // hide continue_to metadata
                    $('[rel="scalar:continue_to"]').each(function() {
                        var href = $(this).attr('href');
                        $('span[resource="' + href + '"]').hide();
                    });
                    break;

                case 'image_header':
                    var banner = currentNode.banner;
                    if ('undefined' != typeof(banner) && banner.length && -1 == banner.indexOf('//')) banner = $('link#parent').attr('href') + banner;
                    $('.page').css('padding-top', '5rem');
                    $('article > header').before('<div class="image_header"><div class="title_card"></div></div>');
                    // $( '.image_header' ).css( 'backgroundImage', $('body').css('backgroundImage') );
                    $('.image_header').css('background-image', "url('" + banner + "')");
                    $('.title_card').append($('header > h1'));
                    if (currentNode.current.description != null) {
                        $('.title_card').append('<div class="description">' + currentNode.current.description + '</div>');
                    }
                    page.setupScreenedBackground();
                    page.addHeaderPathInfo();
                    page.addRelationshipNavigation({
                        showLists: true,
                        showParentNav: true,
                        showChildNav: true,
                        showLateralNav: true,
                        showAnno: true,
                        showComments: true,
                        showTags: true
                    });
                    page.addIncomingComments();
                    page.addAdditionalMetadata();
                    page.addExternalLinks();
                    page.addColophon();
                    page.addNotes();
                    break;

                default:
                    var i, j, n, o, p,
                        okToAddExtras = true;

                    switch (viewType) {

                        // look for related geographic metadata and use it to build a Google Map
                        case "google_maps":
                        case "google_maps_path":

                            $('.page').css('padding-top', '5.0rem');
                            $('header > h1').before('<div id="google-maps" class="maximized-embed"></div>');

                            // create map
                            var mapOptions = {
                                zoom: 8,
                                mapTypeId: google.maps.MapTypeId.ROADMAP
                            }
                            var map = new google.maps.Map(document.getElementById('google-maps'), mapOptions);
                            var markerCount = 0;
                            var validCoordCount = 0;
                            var coordsAreValid;

                            //Global scope google map variable
                            $gmaps = $('#google-maps');

                            // create info window
                            var infoWindow = new google.maps.InfoWindow({
                                content: contentString,
                                maxWidth: 400
                            });

                            var marker, property, contents, node, contentString, label, pathIndex,
                                properties = [
                                    'http://purl.org/dc/terms/coverage',
                                    'http://purl.org/dc/terms/spatial'
                                ]
                            markers = [],
                                foundError = true;

                            var pathContents = currentNode.getRelatedNodes('path', 'outgoing');
                            var tagContents = currentNode.getRelatedNodes('tag', 'outgoing');
                            var contents = pathContents.concat(tagContents);

                            for (p in properties) {

                                property = properties[p];

                                // if the current page has the spatial property, then
                                if (currentNode.current.properties[property] != null) {

                                    n = currentNode.current.properties[property].length;
                                    for (i = 0; i < n; i++) {
                                        coordsAreValid = page.addMarkerFromLatLonStrToMap(
                                            currentNode.current.properties[property][i].value,
                                            currentNode.getDisplayTitle(),
                                            currentNode.current.description,
                                            null,
                                            map,
                                            infoWindow,
                                            currentNode.getAbsoluteThumbnailURL()
                                        );
                                        markerCount++;
                                        if (coordsAreValid) {
                                            validCoordCount++;
                                        }
                                    }

                                }

                                n = contents.length;

                                // add markers for each content element that has the spatial property
                                for (i = 0; i < n; i++) {

                                    node = contents[i];

                                    if (node.current.properties[property] != null) {

                                        o = node.current.properties[property].length;
                                        for (j = 0; j < o; j++) {

                                            label = null;
                                            pathIndex = pathContents.indexOf(node);
                                            if (pathIndex != -1) {
                                                label = (pathIndex + 1).toString();
                                            }

                                            coordsAreValid = page.addMarkerFromLatLonStrToMap(
                                                node.current.properties[property][j].value,
                                                node.getDisplayTitle(),
                                                node.current.description,
                                                node.url,
                                                map,
                                                infoWindow,
                                                node.getAbsoluteThumbnailURL(),
                                                label
                                            );
                                            markerCount++;
                                            if (coordsAreValid) {
                                                validCoordCount++;
                                            }
                                        }
                                    }
                                }
                            }

                            $gmaps.css('max-height', 0.6 * $(window).height());

                            $(window).on('resize', function() {
                                var markers = $gmaps.data('markers')
                                if (markers.length > 1) {
                                    $gmaps.data('map').fitBounds($('#google-maps').data('bounds'));
                                }
                                $gmaps.css('max-height', 0.6 * $(window).height());
                            });

                            if (validCoordCount == 0) {
                                $gmaps.find('.alert').remove();
                                $gmaps.append('<div class="alert alert-danger" style="margin: 1rem;">Scalar couldn’t find any valid geographic metadata associated with this page.</div>');
                            } else if (markerCount == 0) {
                                $gmaps.find('.alert').remove();
                                $gmaps.append('<div class="alert alert-danger" style="margin: 1rem;">Scalar couldn’t find any geographic metadata associated with this page.</div>');
                            }
                            break;

                        case "vis":
                        case "vistoc":
                        case "visconnections":
                        case "visindex":
                        case "visradial":
                        case "vispath":
                        case "vismedia":
                        case "vistag":
                        case "tags":

                            switch (viewType) {

                                case "vis":
                                case "visindex":
                                    visOptions = {
                                        modal: false,
                                        content: 'all',
                                        relations: 'all',
                                        format: 'grid'
                                    }
                                    break;

                                case "vistoc":
                                    visOptions = {
                                        modal: false,
                                        content: 'toc',
                                        relations: 'all',
                                        format: 'tree'
                                    }
                                    break;

                                case "visconnections":
                                    visOptions = {
                                        modal: false,
                                        content: 'all',
                                        relations: 'all',
                                        format: 'force-directed'
                                    }
                                    break;

                                case "visradial":
                                    visOptions = {
                                        modal: false,
                                        content: 'all',
                                        relations: 'all',
                                        format: 'radial'
                                    }
                                    break;

                                case "vispath":
                                    visOptions = {
                                        modal: false,
                                        content: 'current',
                                        relations: 'path',
                                        format: 'tree'
                                    }
                                    break;

                                case "vismedia":
                                    visOptions = {
                                        modal: false,
                                        content: 'current',
                                        relations: 'referee',
                                        format: 'force-directed'
                                    }
                                    break;

                                case "vistag":
                                    visOptions = {
                                        modal: false,
                                        content: 'current',
                                        relations: 'tag',
                                        format: 'force-directed'
                                    }
                                    break;

                                case "tags":
                                    visOptions = {
                                        modal: false,
                                        content: 'external',
                                        relations: 'none',
                                        format: 'tagcloud'
                                    }
                                    break;

                            }
                            visualization = $('<div class="visualization"></div>');
                            $('article > header > h1').addClass("visualization");
                            $('article > header').after(visualization);
                            visualization.scalarvis(visOptions);
                            break;

                        case "timeline":
                            $('.page').css('padding-top', '5rem');
                            var parseDate = function(date, d_string) {
                                var d = {
                                    year: date.getFullYear()
                                };
                                var month = date.getMonth() + 1; //Timeline expects 1-12; JS spits out 0-11
                                if (month > 1 || d_string.length > 4 || (d_string.length > 2 && (d_string.match(/\//g).length > 0 || d_string.match(/,/g).length > 0))) {
                                    d.month = month;
                                    var day = date.getDate();
                                    if (day > 1 || d_string.length > 6) {
                                        d.day = day;
                                        var hour = date.getHours();
                                        if (hour > 0) {
                                            d.hour = hour;
                                            var minute = date.getMinutes();
                                            if (minute > 0) {
                                                d.minute = minute;
                                                var second = date.getSeconds();
                                                if (second > 0) {
                                                    d.second = second;
                                                    var millisecond = date.getMilliseconds();
                                                    if (millisecond > 0) {
                                                        d.millisecond = millisecond;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                return d;
                            };
                            var timelinePromise = $.Deferred(function(deferred) {
                                $(deferred.resolve);
                            });
                            if (typeof loadedTimeline == 'undefined' || !loadedTimeline) {
                                var timelinePromise = $.Deferred();
                                $.getScript(modules_uri + '/cantaloupe/js/date-utils.min.js', function() {
                                    $.getScript(modules_uri + '/cantaloupe/js/timeline.min.js', function() {
                                        $('head').append('<link rel="stylesheet" type="text/css" href="' + modules_uri + '/cantaloupe/css/timeline.min.css" />')
                                        loadedTimeline = true;
                                        timelinePromise.resolve();
                                    });
                                });
                            }
                            timelinePromise.then(function() {
                                var node = scalarapi.model.getCurrentPageNode();

                                var relatedNodes = [];

                                relatedNodes.push(node.getRelatedNodes('path', 'outgoing'));
                                relatedNodes.push(node.getRelatedNodes('tag', 'outgoing'));
                                relatedNodes.push(node.getRelatedNodes('referee', 'outgoing'));
                                relatedNodes.push(node.getRelatedNodes('annotation', 'outgoing'));

                                var tempdata = {
                                    events: []
                                };
                                var base_url = $('link#parent').attr('href');
                                //Get the main timeline items, if there are any
                                for (var i in relatedNodes) {
                                    var nodeSet = relatedNodes[i];
                                    for (var n in nodeSet) {
                                        var relNode = nodeSet[n].current;
                                        if (typeof relNode.auxProperties != 'undefined' && ((typeof relNode.auxProperties['dcterms:temporal'] != 'undefined' && relNode.auxProperties['dcterms:temporal'].length > 0) || (typeof relNode.auxProperties['dcterms:date'] != 'undefined' && relNode.auxProperties['dcterms:date'].length > 0))) {
                                            var entry = {};
                                            var useDateStringAsDateValue = false;
                                            if (typeof relNode.auxProperties['dcterms:temporal'] != 'undefined' && relNode.auxProperties['dcterms:temporal'].length > 0) {
                                                var temporal_data = relNode.auxProperties['dcterms:temporal'][0];
                                            } else {
                                                var temporal_data = relNode.auxProperties['dcterms:date'][0];
                                            }

                                            var dashCount = (temporal_data.match(/-/g) || []).length;
                                            var slashCount = (temporal_data.match(/\//g) || []).length;

                                            var contains_seperator = (temporal_data.indexOf(" until ") + temporal_data.indexOf(" to ")) > -2;
                                            if (dashCount != 1 && !contains_seperator) {
                                                //Assume we have a single date, either dash seperated (more than one dash) or slash seperated (no dash)
                                                var d_string = temporal_data.replace(/~+$/, ''); //strip whitespace
                                                var d = new Date(d_string); //parse as a date
                                                if (d instanceof Date) {
                                                    entry.start_date = parseDate(d, d_string);
                                                }
                                                if (dashCount < 2 || slashCount < 2) {
                                                    useDateStringAsDateValue = true;
                                                }
                                            } else {
                                                if (contains_seperator) {
                                                    temporal_data = temporal_data.replace('from ', '');
                                                    if (temporal_data.indexOf(" until ") >= 0) {
                                                        var dateParts = temporal_data.split(" until ");
                                                    } else {
                                                        var dateParts = temporal_data.split(" to ");
                                                    }
                                                } else {
                                                    var dateParts = temporal_data.replace(' - ', '-').split('-');
                                                }

                                                //We should now have two dates - a start and and end
                                                if (dateParts.length == 2) {
                                                    dateParts[0] = dateParts[0].replace(/~+$/, ''); //Remove white space
                                                    dateParts[1] = dateParts[1].replace(/~+$/, ''); //Remove white space

                                                    for (var x in dateParts) {
                                                        var dashCount = (dateParts[x].match(/-/g) || []).length;
                                                        var slashCount = (dateParts[x].match(/\//g) || []).length;

                                                        if (dashCount < 2 || slashCount < 2) {
                                                            useDateStringAsDateValue = true;
                                                            break;
                                                        }
                                                    }

                                                    var sdate = new Date(dateParts[0]); //parse as a date
                                                    var edate = new Date(dateParts[1]); //parse as a date

                                                    if (sdate instanceof Date && edate instanceof Date) {
                                                        entry.start_date = parseDate(sdate, dateParts[0]);
                                                        entry.end_date = parseDate(edate, dateParts[1]);
                                                    }

                                                }
                                            }
                                            //Cool, got time stuff out of the way!
                                            //Let's do the other components Timeline.js expects
                                            entry.text = {
                                                headline: '<a href="' + nodeSet[n].url + '">' + nodeSet[n].getDisplayTitle() + '</a>'
                                            };

                                            if (useDateStringAsDateValue) {
                                                entry.display_date = temporal_data.replace(/~+$/, '');
                                                if (nodeSet[n].getDisplayTitle() == entry.display_date) {
                                                    entry.display_date = "&nbsp;";
                                                }
                                            }

                                            if (typeof relNode.description != 'undefined' && relNode.description != '' && relNode.description != null) {
                                                entry.text.text = relNode.description
                                            }

                                            //Parse thumbnail url
                                            var thumbnail_url = nodeSet[n].getAbsoluteThumbnailURL();

                                            //Now just check to make sure this node is a media node or not - if so, add it to the timeline entry
                                            if (typeof nodeSet[n].scalarTypes.media !== 'undefined') {
                                                entry.media = {
                                                    url: relNode.sourceFile,
                                                    thumbnail: thumbnail_url
                                                };
                                            } else if (typeof nodeSet[n].thumbnail !== 'undefined' && nodeSet[n].thumbnail != null && nodeSet[n].thumbnail != '') {
                                                entry.media = {
                                                    url: thumbnail_url,
                                                    thumbnail: thumbnail_url
                                                };
                                            }

                                            if (typeof nodeSet[n].background !== 'undefined') {
                                                entry.background = { url: base_url + nodeSet[n].background }
                                            }

                                            tempdata.events.push(entry);
                                        }
                                    }
                                }

                                //$( '.page' ).css( 'padding-top', '5.0rem' );

                                $timeline = $('<div class="caption_font timeline_embed"><div></div></div>').insertBefore('header > h1');
                                $timeline_container = $timeline.find('div');

                                var height = 0.6 * $(window).height();
                                $timeline_container.height(height);
                                $timeline.height(height + 15);

                                timeline = new TL.Timeline($timeline_container.get(0), tempdata);

                                $('body').addClass('timeline');
                                $(window).on('resize', function() {
                                    var height = 0.6 * $(window).height();
                                    $timeline_container.height(height);
                                    $timeline.height(height + 20);
                                });
                            });
                            break;

                        case "versions":
                            if (page.is_author || page.is_commentator || page.is_reviewer) {
                                $('h1[property="dcterms:title"]').after('<h2>Version editor</h2>');
                            } else {
                                $('h1[property="dcterms:title"]').after('<h2>Version history</h2>');
                            }
                            $('.versions-page').removeClass('body_copy').addClass('page_margins');
                            okToAddExtras = false;
                            break;

                        case "meta":
                            $('h1[property="dcterms:title"]').after('<h2 class="meta-header" style="margin-bottom: 0rem;">Metadata</h2>');
                            $('.meta-page').removeClass('body_copy').addClass('page_margins');
                            okToAddExtras = true;
                            break;

                        case "history":
                            $('h1[property="dcterms:title"]').after('<h2 style="margin-bottom: 0rem;">Version history</h2>');
                            $('.history-page').removeClass('body_copy').addClass('page_margins');
                            okToAddExtras = false;
                            break;

                        case "edit":
                        	okToAddExtras = false;
                        	break;

                        case "annotation_editor":
                            var headerString = '<h2 style="margin-bottom: 0rem;">Annotation editor</h2>';
                            if (currentNode.current.mediaSource.contentType == 'image') {
                                headerString += '<p class="body_copy">To create an image annotation, click and drag on the image, or use the plus button below.</p>';
                            }
                            $('h1[property="dcterms:title"]').after(headerString);
                            $('.annotation_editor-page').removeClass('body_copy').addClass('page_margins');
                            $('.annobuilder').addClass('caption_font');
                            // hide continue_to metadata
                            $('[rel="scalar:continue_to"]').each(function() {
                                var href = $(this).attr('href');
                                $('span[resource="' + href + '"]').hide();
                            });
                            okToAddExtras = false;
                            break;

                        case "resources":
                            $("ul.resources span.desc").contents().unwrap().wrap('<p class="desc caption_font">');
                            break;

                        case "toc":
                            $("ol.toc").before('<h3 class="heading_font heading_weight">Table of Contents</h3>');
                            break;

                    }

                    page.setupScreenedBackground();
                    page.addHeaderPathInfo();
                    if (okToAddExtras) {
                        page.addRelationshipNavigation({
                            showLists: true,
                            showParentNav: true,
                            showChildNav: true,
                            showLateralNav: true,
                            showAnno: true,
                            showComments: true,
                            showTags: true
                        });
                        page.addIncomingComments();
                        if (($('[resource="' + currentNode.url + '"][typeof="scalar:Media"]').length == 0) && (viewType != "meta") && (viewType != "edit")) {
                            page.addAdditionalMetadata();
                        }
                        page.addExternalLinks();
                        page.addNotes();
                    }
                    page.addColophon();
                    if (viewType != 'edit') {
                        page.addContext();
                    }
                    break;

            }

            addTemplateLinks($('article'), 'cantaloupe');

            $('body').addClass('body_font');
            $('h1, h2, h3, h4, h5, h6, .mediaElementFooter, #comment, .media_metadata').addClass('heading_font heading_weight');
            $('h1, h2, h3').addClass('clearboth');

            /*
			$( document ).ready( function() {
				if ( !$.cookie( 'warningMessageDismissed' ) ) {
					var message = $('<div id="message" style="position: absolute; cursor: pointer; left: 20px; top: 70px; max-width: 400px; padding: 15px; z-index:99999; background-color: #fdcccb;">Warning message</div>').appendTo( 'body' );
					message.click( function() {
						$( this ).hide();
						$.cookie( 'warningMessageDismissed', true, { path: '/' } );
					} );
				}
			} );
			*/

            page.handleBook(); // we used to bind this to the return of a loadBook call, but now we can call it immediately

            $('.note_viewer').click(function(e) {
                e.stopPropagation();
            })

            $('body').click(function() {
                $.each($('.note_viewer'), function() {
                    page.hideNote(this);
                })
            })

            // current node is null
        } else {
            if (extension == 'edit') {
                var anchorVars = scalarapi.getAnchorVars(window.location.href);
                if (anchorVars != null) {
                    if (anchorVars.type == "media") {
                        page.bodyContent().prepend('<h2 class="heading_font" style="margin-top: 0;">Import Internet Media File</h2>');
                    }
                }
            }
            page.setupScreenedBackground();
        }


        return page;

    }


})(jQuery);
